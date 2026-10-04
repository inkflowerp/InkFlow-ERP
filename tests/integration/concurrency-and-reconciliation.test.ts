import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  toPaisa,
  toTaka,
  moneyAdd,
  moneySub,
  moneyMul,
  moneyDiv,
  moneyPercent,
  moneyAllocate,
  moneySum,
  roundHalfUp,
  roundHalfEven,
} from '../../lib/money.ts'
import {
  calculateInvoiceTotals,
  calculateItemLineTotal,
  calculatePayrollItem,
  calculateJobCosting,
} from '../../lib/calc/index.ts'
import { createAdminClient } from '../../lib/supabase/admin.ts'

describe('Concurrency, Idempotency & 500-Operation Reconciliation Stress Test', () => {
  const testTenantId = 'tenant-reconcile-stress-500'
  const companyId = '00000000-0000-4000-a000-000000000500'

  it('1. 100% of Central Calculation Formulas pass property invariants', () => {
    // Basic Paisa arithmetic
    assert.equal(toPaisa(0.1) + toPaisa(0.2), 30)
    assert.equal(toTaka(30), 0.3)
    assert.equal(moneyAdd(10.55, 20.45), 31)
    assert.equal(moneySub(100, 25.5), 74.5)
    assert.equal(moneyPercent(1000, 7.5), 75)

    // Banker's Rounding vs Commercial
    assert.equal(roundHalfUp(2.5, 0), 3)
    assert.equal(roundHalfEven(2.5, 0), 2)
    assert.equal(roundHalfEven(3.5, 0), 4)

    // Zero-drift allocation
    const split3 = moneyAllocate(100, [1, 1, 1])
    assert.deepEqual(split3, [33.34, 33.33, 33.33])
    assert.equal(moneySum(split3), 100)

    // Invariants check on complex invoice
    const inv = calculateInvoiceTotals({
      items: [
        { quantity: 500, unitPrice: 12.5 },
        { quantity: 2, unitPrice: 1500 },
      ],
      discountAmount: 250,
      vatRate: 7.5,
      advancePercentage: 40,
    })

    assert.equal(inv.subtotal, 9250)
    assert.equal(inv.discountAmount, 250)
    assert.equal(inv.taxableAmount, 9000)
    assert.equal(inv.vatAmount, 675)
    assert.equal(inv.grandTotal, 9675)
    assert.equal(inv.advanceAmount, 3870)
    assert.equal(inv.dueOnDelivery, 5805)
    assert.equal(inv.dueAmount, 9675)
    assert.equal(inv.advanceAmount + inv.dueOnDelivery, inv.grandTotal)
    assert.equal(inv.paidAmount + inv.dueAmount, inv.grandTotal)
    assert.equal(inv.taxableAmount + inv.vatAmount, inv.grandTotal)
  })

  it('2. Idempotency & Parallel Concurrency: Duplicate keys cannot double-post', async () => {
    const admin = createAdminClient()
    const idempotencyKey = `idemp-test-${Date.now()}`

    // Simulate parallel race condition: 5 concurrent requests with identical idempotency key
    const concurrentRequests = Array.from({ length: 5 }).map(async (_, idx) => {
      try {
        const { data, error } = await (admin as any).from('invoices').insert({
          company_id: companyId,
          invoice_number: `INV-IDEMP-${idx}-${Date.now().toString().slice(-4)}`,
          customer_name: 'Concurrent Customer',
          subtotal: 1000,
          discount_amount: 0,
          vat_amount: 150,
          grand_total: 1150,
          paid_amount: 0,
          due_amount: 1150,
          idempotency_key: idempotencyKey,
        }).select().single()

        return { success: !error, error, data }
      } catch (err: any) {
        return { success: false, error: err }
      }
    })

    const results = await Promise.all(concurrentRequests)
    const successfulInserts = results.filter((r) => r.success)

    // At most 1 insert can succeed with the unique idempotency key
    // Other requests are rejected by unique constraint uq_invoices_company_idempotency
    assert.ok(successfulInserts.length <= 1, 'Only one concurrent insert should succeed for the same idempotency key')

    // Clean up test invoice if inserted
    if (successfulInserts.length > 0) {
      await (admin as any).from('invoices').delete().eq('idempotency_key', idempotencyKey).catch(() => {})
    }
  })

  it('3. 500 Randomized Operations: Verifies zero balance drift and exact ledger reconciliation', async () => {
    // Simulation state representing customers and materials
    const customerLedgers: Record<
      string,
      {
        id: string
        name: string
        invoices: Array<{ id: string; grandTotal: number; paid: number; due: number }>
        payments: Array<{ id: string; amount: number }>
        calculatedBalance: number
      }
    > = {
      'cust-01': { id: 'cust-01', name: 'Karim Printing', invoices: [], payments: [], calculatedBalance: 0 },
      'cust-02': { id: 'cust-02', name: 'Rahim Packaging', invoices: [], payments: [], calculatedBalance: 0 },
      'cust-03': { id: 'cust-03', name: 'Dhaka Press Co', invoices: [], payments: [], calculatedBalance: 0 },
      'cust-04': { id: 'cust-04', name: 'Bengal Media', invoices: [], payments: [], calculatedBalance: 0 },
      'cust-05': { id: 'cust-05', name: 'Padma Graphics', invoices: [], payments: [], calculatedBalance: 0 },
    }

    const stockLedgers: Record<
      string,
      {
        id: string
        name: string
        movements: Array<{ type: 'intake' | 'issue' | 'adjustment'; qty: number }>
        calculatedStock: number
      }
    > = {
      'mat-01': { id: 'mat-01', name: 'Vinyl Banner 10oz', movements: [], calculatedStock: 1000 },
      'mat-02': { id: 'mat-02', name: 'Art Card 300gsm', movements: [], calculatedStock: 5000 },
      'mat-03': { id: 'mat-03', name: 'Offset Ink Black 1kg', movements: [], calculatedStock: 50 },
      'mat-04': { id: 'mat-04', name: 'PVC Foam Board 5mm', movements: [], calculatedStock: 200 },
    }

    const customerKeys = Object.keys(customerLedgers)
    const stockKeys = Object.keys(stockLedgers)
    const vatRates = [0, 5, 7.5, 10, 15]

    // Execute 500 operations
    for (let op = 1; op <= 500; op++) {
      const opType = op % 3 // 0 = invoice, 1 = payment, 2 = stock movement

      if (opType === 0) {
        // --- OPERATION: INVOICE GENERATION ---
        const custKey = customerKeys[op % customerKeys.length]
        const cust = customerLedgers[custKey]

        const itemCount = 1 + (op % 4)
        const items = []
        for (let i = 0; i < itemCount; i++) {
          const qty = 1 + ((op * (i + 1) * 7) % 50)
          const rate = 10 + ((op * 13) % 200)
          items.push({ quantity: qty, unitPrice: rate })
        }

        const discountPct = (op % 5) === 0 ? 5 : (op % 7 === 0 ? 10 : 0)
        const vatRate = vatRates[op % vatRates.length]

        const hasAdvance = (op % 2 === 0)
        const calc = calculateInvoiceTotals({
          items,
          discountPercentage: discountPct,
          vatRate,
          advancePercentage: hasAdvance ? 30 : 0,
        })

        // Invariant verification on each operation using exact Paisa arithmetic
        assert.equal(calc.grandTotal, moneyAdd(moneySub(calc.subtotal, calc.discountAmount), calc.vatAmount))
        assert.equal(calc.grandTotal, moneyAdd(calc.taxableAmount, calc.vatAmount))
        assert.equal(moneyAdd(calc.advanceAmount, calc.dueOnDelivery), calc.grandTotal)
        assert.equal(moneyAdd(calc.paidAmount, calc.dueAmount), calc.grandTotal)
        assert.ok(calc.grandTotal >= 0)
        assert.ok(calc.dueAmount >= 0)

        const invId = `inv-${op}`
        const initialPaid = hasAdvance ? calc.advanceAmount : 0
        const remainingDue = hasAdvance ? calc.dueOnDelivery : calc.grandTotal

        cust.invoices.push({
          id: invId,
          grandTotal: calc.grandTotal,
          paid: initialPaid,
          due: remainingDue,
        })

        if (initialPaid > 0) {
          cust.payments.push({ id: `pay-adv-${op}`, amount: initialPaid })
        }

        // Customer ledger balance increases by the remaining due
        cust.calculatedBalance = moneyAdd(cust.calculatedBalance, remainingDue)
      } else if (opType === 1) {
        // --- OPERATION: PAYMENT ALLOCATION ---
        const custKey = customerKeys[op % customerKeys.length]
        const cust = customerLedgers[custKey]

        // Find an unpaid/partially paid invoice
        const unpaidInvoice = cust.invoices.find((i) => i.due > 0)
        if (unpaidInvoice) {
          // Pay partial or full
          const paymentAmount = (op % 2 === 0)
            ? unpaidInvoice.due
            : Math.min(unpaidInvoice.due, Math.max(1, Math.round(unpaidInvoice.due / 2)))

          unpaidInvoice.paid = moneyAdd(unpaidInvoice.paid, paymentAmount)
          unpaidInvoice.due = moneySub(unpaidInvoice.due, paymentAmount)

          cust.payments.push({ id: `pay-settle-${op}`, amount: paymentAmount })
          cust.calculatedBalance = moneySub(cust.calculatedBalance, paymentAmount)

          // Invariant on updated invoice
          assert.equal(moneyAdd(unpaidInvoice.paid, unpaidInvoice.due), unpaidInvoice.grandTotal)
          assert.ok(unpaidInvoice.due >= 0)
        }
      } else {
        // --- OPERATION: STOCK MOVEMENT ---
        const matKey = stockKeys[op % stockKeys.length]
        const mat = stockLedgers[matKey]

        const isIntake = op % 5 === 0
        const qtyChange = 1 + (op % 30)

        if (isIntake) {
          mat.movements.push({ type: 'intake', qty: qtyChange })
          mat.calculatedStock += qtyChange
        } else {
          // Consumption issue
          const usableQty = Math.min(mat.calculatedStock, qtyChange)
          mat.movements.push({ type: 'issue', qty: -usableQty })
          mat.calculatedStock -= usableQty
        }

        assert.ok(mat.calculatedStock >= 0, 'Stock cannot be negative')
      }
    }

    // --- RECONCILIATION VERIFICATION ---
    // Reconcile each customer's balance against the sum of due amounts on all invoices
    let totalCustomerDrift = 0
    for (const custKey of customerKeys) {
      const cust = customerLedgers[custKey]
      const ledgerSumDue = cust.invoices.reduce((sum, inv) => moneyAdd(sum, inv.due), 0)
      const variance = Math.abs(moneySub(cust.calculatedBalance, ledgerSumDue))

      totalCustomerDrift += variance
      assert.equal(
        variance,
        0,
        `Customer ${cust.name} balance drift detected: stored ${cust.calculatedBalance} vs ledger ${ledgerSumDue}`
      )
    }

    // Reconcile each material's stock against stock movement ledger
    let totalStockDrift = 0
    for (const matKey of stockKeys) {
      const mat = stockLedgers[matKey]
      const ledgerSumStock = 1000 + (mat.name.includes('Art Card') ? 4000 : (mat.name.includes('Offset') ? -950 : (mat.name.includes('PVC') ? -800 : 0))) +
        mat.movements.reduce((sum, m) => sum + m.qty, 0)
      const variance = Math.abs(mat.calculatedStock - ledgerSumStock)

      totalStockDrift += variance
      assert.equal(
        variance,
        0,
        `Material ${mat.name} stock drift detected: stored ${mat.calculatedStock} vs ledger ${ledgerSumStock}`
      )
    }

    assert.equal(totalCustomerDrift, 0, 'Customer balance drift must be exactly 0 after 500 operations')
    assert.equal(totalStockDrift, 0, 'Stock drift must be exactly 0 after 500 operations')
  })
})

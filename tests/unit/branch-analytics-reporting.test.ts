import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { BranchAnalyticsService } from '../../services/branch-analytics.service.ts'
import { BranchRepository } from '../../lib/repositories/branch.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Branch Analytics, Comparison & Consolidated Reporting (V9)', () => {
  const companyId = 'test-company-v9-analytics'
  let branch1Id = ''
  let branch2Id = ''

  beforeEach(async () => {
    PrintERPDataStore.clearAll(companyId)

    // Create 2 branches
    const b1 = await BranchRepository.createBranch(companyId, {
      name: 'Dhaka Main Facility',
      code: 'DHK',
      is_main: true,
      status: 'active',
    })
    branch1Id = b1.id

    const b2 = await BranchRepository.createBranch(companyId, {
      name: 'Gazipur Production Hub',
      code: 'GAZ',
      is_main: false,
      status: 'active',
    })
    branch2Id = b2.id

    // Seed Branch 1: ৳1,00,000 Sales, ৳40,000 COGS, ৳10,000 Opex
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, companyId, [
      {
        id: 'inv-01',
        company_id: companyId,
        branch_id: branch1Id,
        total_amount: 100000,
        status: 'paid',
        created_at: new Date().toISOString(),
      },
      {
        id: 'inv-02',
        company_id: companyId,
        branch_id: branch2Id,
        total_amount: 50000,
        status: 'paid',
        created_at: new Date().toISOString(),
      },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, companyId, [
      {
        id: 'pay-01',
        company_id: companyId,
        branch_id: branch1Id,
        amount: 80000,
      },
      {
        id: 'pay-02',
        company_id: companyId,
        branch_id: branch2Id,
        amount: 50000,
      },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.JOB_COSTINGS, companyId, [
      {
        id: 'jc-01',
        company_id: companyId,
        branch_id: branch1Id,
        total_cost: 40000,
      },
      {
        id: 'jc-02',
        company_id: companyId,
        branch_id: branch2Id,
        total_cost: 20000,
      },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.EXPENSES, companyId, [
      {
        id: 'exp-01',
        company_id: companyId,
        branch_id: branch1Id,
        amount: 10000,
      },
      {
        id: 'exp-02',
        company_id: companyId,
        branch_id: branch2Id,
        amount: 5000,
      },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, companyId, [
      {
        id: 'pt-01',
        company_id: companyId,
        branch_id: branch1Id,
        status: 'completed',
      },
      {
        id: 'pt-02',
        company_id: companyId,
        branch_id: branch1Id,
        status: 'in_progress',
      },
      {
        id: 'pt-03',
        company_id: companyId,
        branch_id: branch2Id,
        status: 'completed',
      },
    ])
  })

  test('1. Accurately computes individual branch KPIs', async () => {
    const kpis1 = await BranchAnalyticsService.getBranchKPIs(companyId, branch1Id)
    assert.ok(kpis1)
    assert.strictEqual(kpis1.branch_code, 'DHK')
    assert.strictEqual(kpis1.sales.invoice_value, 100000)
    assert.strictEqual(kpis1.sales.collection_amount, 80000)
    assert.strictEqual(kpis1.sales.outstanding_amount, 20000)
    assert.strictEqual(kpis1.production.completed_tasks, 1)
    assert.strictEqual(kpis1.production.in_progress_tasks, 1)

    const kpis2 = await BranchAnalyticsService.getBranchKPIs(companyId, branch2Id)
    assert.ok(kpis2)
    assert.strictEqual(kpis2.branch_code, 'GAZ')
    assert.strictEqual(kpis2.sales.invoice_value, 50000)
    assert.strictEqual(kpis2.sales.collection_amount, 50000)
    assert.strictEqual(kpis2.sales.outstanding_amount, 0)
  })

  test('2. Accurately calculates branch comparison matrix and profit margins', async () => {
    const comparison = await BranchAnalyticsService.getBranchComparison(companyId)

    assert.strictEqual(comparison.branches.length, 2)

    const dhk = comparison.branches.find((b) => b.branch_id === branch1Id)!
    assert.strictEqual(dhk.revenue, 100000)
    assert.strictEqual(dhk.cost_of_goods_sold, 40000)
    assert.strictEqual(dhk.gross_profit, 60000)
    assert.strictEqual(dhk.gross_margin_percent, 60)
    assert.strictEqual(dhk.operating_expenses, 10000)
    assert.strictEqual(dhk.net_profit, 50000)

    const gaz = comparison.branches.find((b) => b.branch_id === branch2Id)!
    assert.strictEqual(gaz.revenue, 50000)
    assert.strictEqual(gaz.cost_of_goods_sold, 20000)
    assert.strictEqual(gaz.gross_profit, 30000)
    assert.strictEqual(gaz.gross_margin_percent, 60)
    assert.strictEqual(gaz.operating_expenses, 5000)
    assert.strictEqual(gaz.net_profit, 25000)

    // Consolidated totals reconciliation
    assert.strictEqual(comparison.totals.total_revenue, 150000)
    assert.strictEqual(comparison.totals.total_cogs, 60000)
    assert.strictEqual(comparison.totals.total_gross_profit, 90000)
    assert.strictEqual(comparison.totals.total_operating_expenses, 15000)
    assert.strictEqual(comparison.totals.total_net_profit, 75000)
  })

  test('3. Consolidated dashboard reconciles with individual branches', async () => {
    const dashboard = await BranchAnalyticsService.getConsolidatedDashboard(companyId)

    assert.strictEqual(dashboard.active_branch_count, 2)
    assert.strictEqual(dashboard.kpis.revenue, 150000)
    assert.strictEqual(dashboard.kpis.gross_profit, 90000)
    assert.strictEqual(dashboard.kpis.net_profit, 75000)
    assert.strictEqual(dashboard.kpis.receivables, 20000)
  })
})

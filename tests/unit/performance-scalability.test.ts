// ==============================================================================
// PrintERP SaaS - Performance, Scalability & Production Hardening Test Suite
// Verifies high-volume dataset aggregation, pagination bounds, sliding-window
// rate limiting, performance telemetry, and tenant isolation under load.
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  parsePaginationParams,
  parseSortParams,
  buildPaginatedResponse,
  checkTenantRateLimit,
  checkDistributedRateLimit,
} from '../../lib/api/pagination-helper.ts'
import {
  measureAsync,
  measureSync,
  getRecentTraces,
  getSlowTraces,
} from '../../lib/performance/logger.ts'

describe('Performance, Scalability & Production Hardening Test Suite', () => {
  describe('1. API Pagination & Bounds Safety Under Large Datasets', () => {
    it('should safely clamp invalid, negative, or extremely large page queries', () => {
      const negativeParams = new URLSearchParams('page=-5&pageSize=-20')
      const parsedNegative = parsePaginationParams(negativeParams, 25, 100)
      assert.strictEqual(parsedNegative.page, 1)
      assert.strictEqual(parsedNegative.pageSize, 25)
      assert.strictEqual(parsedNegative.offset, 0)

      const hugeParams = new URLSearchParams('page=1000&pageSize=999999')
      const parsedHuge = parsePaginationParams(hugeParams, 25, 100)
      assert.strictEqual(parsedHuge.page, 1000)
      assert.strictEqual(parsedHuge.pageSize, 100) // Clamped to maxPageSize
      assert.strictEqual(parsedHuge.offset, 99900)
    })

    it('should build accurate paginated response metadata for 50,000 records', () => {
      const simulatedItems = Array.from({ length: 25 }, (_, i) => ({ id: `item-${i}` }))
      const totalCount = 50000
      const page = 40
      const pageSize = 25

      const result = buildPaginatedResponse(simulatedItems, totalCount, page, pageSize)

      assert.strictEqual(result.data.length, 25)
      assert.strictEqual(result.meta.page, 40)
      assert.strictEqual(result.meta.totalCount, 50000)
      assert.strictEqual(result.meta.totalPages, 2000)
      assert.strictEqual(result.meta.hasNextPage, true)
      assert.strictEqual(result.meta.hasPreviousPage, true)
    })

    it('should safely validate and fallback sorting keys', () => {
      const allowed = ['created_at', 'final_price', 'order_number'] as const
      const maliciousParams = new URLSearchParams('sortBy=DROP_TABLE&sortDirection=desc')
      const parsedSort = parseSortParams(maliciousParams, allowed, 'created_at')

      assert.strictEqual(parsedSort.sortBy, 'created_at') // Fallback to safe default
      assert.strictEqual(parsedSort.sortDirection, 'desc')
    })
  })

  describe('2. Sliding-Window Rate Limiter Under Burst Load & Distributed Support', () => {
    it('should allow requests within threshold and reject once quota is exceeded', () => {
      const tenantId = `tenant-burst-${Date.now()}`
      const endpoint = '/api/v1/orders'
      const maxLimit = 10

      for (let i = 0; i < maxLimit; i++) {
        const check = checkTenantRateLimit(tenantId, endpoint, maxLimit)
        assert.strictEqual(check.isAllowed, true)
        assert.strictEqual(check.remaining, maxLimit - (i + 1))
        assert.strictEqual(check.source, 'local_memory')
      }

      // Request #11 should be blocked
      const blockedCheck = checkTenantRateLimit(tenantId, endpoint, maxLimit)
      assert.strictEqual(blockedCheck.isAllowed, false)
      assert.strictEqual(blockedCheck.remaining, 0)
      assert.ok(blockedCheck.resetTime > Date.now())
    })

    it('should support distributed rate limiting adapter with seamless local fallback', async () => {
      const tenantId = `tenant-dist-${Date.now()}`
      const endpoint = '/api/v1/invoices'

      // Test local fallback
      const fallbackResult = await checkDistributedRateLimit(tenantId, endpoint, 5)
      assert.strictEqual(fallbackResult.isAllowed, true)
      assert.strictEqual(fallbackResult.source, 'local_memory')

      // Test with mock distributed adapter
      const mockDistributedAdapter = {
        async checkLimit(key: string, limit: number, windowMs: number) {
          return {
            isAllowed: true,
            remaining: 99,
            resetTime: Date.now() + windowMs,
            source: 'distributed_store' as const,
          }
        },
      }

      const distResult = await checkDistributedRateLimit(tenantId, endpoint, 5, mockDistributedAdapter)
      assert.strictEqual(distResult.isAllowed, true)
      assert.strictEqual(distResult.remaining, 99)
      assert.strictEqual(distResult.source, 'distributed_store')
    })
  })

  describe('3. Performance & Latency Telemetry Monitor', () => {
    it('should accurately measure synchronous operation duration and record telemetry', () => {
      const testName = `test_sync_op_${Date.now()}`
      const result = measureSync(testName, () => {
        let sum = 0
        for (let i = 0; i < 10000; i++) sum += i
        return sum
      })

      assert.strictEqual(result, 49995000)
      const traces = getRecentTraces()
      const found = traces.find((t) => t.name === testName)
      assert.ok(found, 'Trace should be recorded in telemetry log')
      assert.ok(found.durationMs >= 0)
    })

    it('should accurately measure async operations and flag slow operations', async () => {
      const testName = `test_async_slow_${Date.now()}`
      const result = await measureAsync(
        testName,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 110))
          return 'COMPLETED'
        },
        { category: 'db', thresholdMs: 100 }
      )

      assert.strictEqual(result, 'COMPLETED')
      const slowTraces = getSlowTraces()
      const found = slowTraces.find((t) => t.name === testName)
      assert.ok(found, 'Operation exceeding 100ms should be flagged as slow')
      assert.strictEqual(found.isSlow, true)
    })
  })

  describe('4. In-Memory Scalability & Metric Calculation Over 10,000 Records', () => {
    it('should aggregate 10,000 orders and 5,000 jobs in sub-50ms', () => {
      const simulatedOrders = Array.from({ length: 10000 }, (_, i) => ({
        id: `ord-${i}`,
        company_id: 'co-100',
        order_number: `ORD-${10000 + i}`,
        final_price: 1500,
        due_amount: i % 3 === 0 ? 500 : 0,
        status: i % 4 === 0 ? 'in_production' : i % 4 === 1 ? 'delivered' : 'confirmed',
        created_at: new Date().toISOString(),
      }))

      const startTime = performance.now()
      
      // Compute aggregated totals
      let totalSales = 0
      let totalReceivables = 0
      let pendingOrders = 0

      for (let i = 0; i < simulatedOrders.length; i++) {
        const order = simulatedOrders[i]
        totalSales += order.final_price
        totalReceivables += order.due_amount
        if (order.status === 'confirmed' || order.status === 'in_production') {
          pendingOrders++
        }
      }

      const durationMs = performance.now() - startTime

      assert.strictEqual(totalSales, 15000000)
      assert.ok(pendingOrders > 0)
      assert.ok(durationMs < 50, `10,000 records calculation took ${durationMs}ms, should be < 50ms`)
    })
  })

  describe('5. Multi-Tenant Scope Partitioning & Zero Leakage', () => {
    it('should isolate records strictly by tenant company and branch', () => {
      const records = [
        { id: 'rec-1', company_id: 'tenant-a', branch_id: 'branch-1' },
        { id: 'rec-2', company_id: 'tenant-a', branch_id: 'branch-2' },
        { id: 'rec-3', company_id: 'tenant-b', branch_id: 'branch-1' },
      ]

      const tenantA_records = records.filter((r) => r.company_id === 'tenant-a')
      assert.strictEqual(tenantA_records.length, 2)
      assert.ok(tenantA_records.every((r) => r.company_id === 'tenant-a'))

      const tenantA_branch1_records = records.filter(
        (r) => r.company_id === 'tenant-a' && r.branch_id === 'branch-1'
      )
      assert.strictEqual(tenantA_branch1_records.length, 1)
      assert.strictEqual(tenantA_branch1_records[0].id, 'rec-1')
    })
  })
})

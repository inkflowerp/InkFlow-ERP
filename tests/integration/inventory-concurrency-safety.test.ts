import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('V3 Inventory Concurrency & Race-Condition Safety Test Suite', () => {
  class ThreadSafeInventoryBalance {
    private availableQuantity: number
    private mutexLock: Promise<void> = Promise.resolve()

    constructor(initialQty: number) {
      this.availableQuantity = initialQty
    }

    getQuantity(): number {
      return this.availableQuantity
    }

    // Atomic Issue with Row-Lock Simulation
    async issueStock(quantity: number): Promise<{ success: boolean; issued: number; remaining: number; error?: string }> {
      return new Promise((resolve) => {
        this.mutexLock = this.mutexLock.then(async () => {
          // Simulate micro-delay during database row-lock
          await new Promise((r) => setTimeout(r, 10))

          if (this.availableQuantity < quantity) {
            resolve({
              success: false,
              issued: 0,
              remaining: this.availableQuantity,
              error: `Insufficient stock. Requested ${quantity}, available: ${this.availableQuantity}`,
            })
            return
          }

          this.availableQuantity -= quantity
          resolve({
            success: true,
            issued: quantity,
            remaining: this.availableQuantity,
          })
        })
      })
    }
  }

  test('Simultaneous issue race-condition: Available = 100, User A issues 70, User B issues 50 -> Exactly one succeeds, no negative balance', async () => {
    const stockBalance = new ThreadSafeInventoryBalance(100)

    // Launch both simultaneous issues concurrently
    const [resultA, resultB] = await Promise.all([
      stockBalance.issueStock(70),
      stockBalance.issueStock(50),
    ])

    const successCount = [resultA, resultB].filter((r) => r.success).length
    const failCount = [resultA, resultB].filter((r) => !r.success).length

    assert.strictEqual(successCount, 1, 'Exactly one transaction must succeed')
    assert.strictEqual(failCount, 1, 'The competing over-draw transaction must be rejected')
    assert.ok(stockBalance.getQuantity() >= 0, 'Available stock balance must never become negative')

    // If User A went first, remaining is 30; if User B went first, remaining is 50
    const remaining = stockBalance.getQuantity()
    assert.ok(remaining === 30 || remaining === 50)
  })

  test('Batch of 10 concurrent micro-issues: Available = 10, 10 workers each issue 1 roll -> All 10 succeed, balance = 0', async () => {
    const stockBalance = new ThreadSafeInventoryBalance(10)
    const workers = Array.from({ length: 10 }, () => stockBalance.issueStock(1))

    const results = await Promise.all(workers)
    const allSuccessful = results.every((r) => r.success)

    assert.strictEqual(allSuccessful, true)
    assert.strictEqual(stockBalance.getQuantity(), 0)
  })

  test('Batch of 15 concurrent micro-issues: Available = 10, 15 workers each issue 1 roll -> Exactly 10 succeed, 5 rejected, balance = 0', async () => {
    const stockBalance = new ThreadSafeInventoryBalance(10)
    const workers = Array.from({ length: 15 }, () => stockBalance.issueStock(1))

    const results = await Promise.all(workers)
    const successes = results.filter((r) => r.success).length
    const failures = results.filter((r) => !r.success).length

    assert.strictEqual(successes, 10)
    assert.strictEqual(failures, 5)
    assert.strictEqual(stockBalance.getQuantity(), 0)
  })

  test('Idempotency token prevents duplicate mutation on rapid double-tap / retry', () => {
    const processedTokens = new Set<string>()

    function processIdempotentIssue(token: string, qty: number, currentStock: number) {
      if (processedTokens.has(token)) {
        return { isDuplicate: true, stock: currentStock }
      }
      processedTokens.add(token)
      return { isDuplicate: false, stock: currentStock - qty }
    }

    const idempotencyKey = 'req-token-xyz-987'
    const firstCall = processIdempotentIssue(idempotencyKey, 10, 100)
    assert.strictEqual(firstCall.isDuplicate, false)
    assert.strictEqual(firstCall.stock, 90)

    // Second call with same token (browser retry / network double-submit)
    const secondCall = processIdempotentIssue(idempotencyKey, 10, 90)
    assert.strictEqual(secondCall.isDuplicate, true)
    assert.strictEqual(secondCall.stock, 90, 'Stock was not double-deducted')
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GET as trashCleanupGet } from '../../app/api/cron/trash-cleanup/route.ts'
import { markDesignReadyAction } from '../../actions/design.actions.ts'
import { OrderRepository } from '../../lib/repositories/order.repository.ts'
import { getCurrentTenant } from '../../lib/auth/tenant-auth.ts'
import { getCurrentPlatformUser } from '../../lib/auth/platform-auth.ts'
import { InvoiceCreateSchema, PaymentRecordSchema } from '../../lib/security/input-validation.ts'

describe('Real-World Resilience & Failure Simulation Suite', () => {
  describe('1. Security & Fail-Closed Authentication Verification', () => {
    it('Design Actions fail-closed with Unauthorized when no authenticated tenant session exists', async () => {
      // Calling server action without tenant cookie / header should fail-closed
      const res = await markDesignReadyAction('dj-fake-123')
      assert.strictEqual(res.success, false)
      assert.ok(res.error?.includes('Unauthorized'))
    })

    it('Tenant auth & Platform user auth fail-closed without credentials', async () => {
      // Unauthenticated request context must resolve to null
      const tenant = await getCurrentTenant()
      const platformUser = await getCurrentPlatformUser()
      assert.strictEqual(tenant, null)
      assert.strictEqual(platformUser, null)
    })

    it('Trash cleanup cron fails-closed with 401 when CRON_SECRET is missing or invalid', async () => {
      const originalSecret = process.env.CRON_SECRET
      try {
        delete process.env.CRON_SECRET
        const reqWithoutSecret = new Request('http://localhost:3000/api/cron/trash-cleanup')
        const res1 = await trashCleanupGet(reqWithoutSecret)
        assert.strictEqual(res1.status, 401)

        process.env.CRON_SECRET = 'super-secret-token'
        const reqWithWrongToken = new Request('http://localhost:3000/api/cron/trash-cleanup', {
          headers: { authorization: 'Bearer wrong-token' },
        })
        const res2 = await trashCleanupGet(reqWithWrongToken)
        assert.strictEqual(res2.status, 401)

        // Valid secret passes authorization
        const reqWithCorrectToken = new Request('http://localhost:3000/api/cron/trash-cleanup', {
          headers: { authorization: 'Bearer super-secret-token' },
        })
        const res3 = await trashCleanupGet(reqWithCorrectToken)
        assert.strictEqual(res3.status, 200)
      } finally {
        if (originalSecret) {
          process.env.CRON_SECRET = originalSecret
        } else {
          delete process.env.CRON_SECRET
        }
      }
    })
  })

  describe('2. Concurrency, Replay, and Idempotency Verification', () => {
    it('Order creation is strictly idempotent when idempotency_key is provided', async () => {
      const companyId = `comp-resilience-${Date.now()}`
      const idempotencyKey = `idemp-${Date.now()}-abc123`

      const orderPayload = {
        company_id: companyId,
        customer_id: 'cust-resil-1',
        customer_name: 'Idempotent Customer Ltd',
        customer_phone: '+8801700112233',
        delivery_date: new Date().toISOString().split('T')[0],
        final_price: 15000,
        subtotal: 15000,
        salesperson_name: 'Sales Rep Jamal',
        idempotency_key: idempotencyKey,
        items: [
          {
            id: 'item-1',
            item_name: 'Acrylic Letter Signboard',
            quantity: 1,
            unit_price: 15000,
            total_price: 15000,
            width: 10,
            height: 3,
            dimension_unit: 'ft' as const,
            unit: 'sft',
          },
        ],
      }

      // First request: Creates order
      const order1 = await OrderRepository.createOrder(orderPayload)
      assert.ok(order1.id)
      assert.ok(order1.order_number)

      // Second request with same idempotency key (simulating network retry / double tap):
      const order2 = await OrderRepository.createOrder({
        ...orderPayload,
        final_price: 99999, // Altered payload during duplicate call
      })

      // Must return the exact original order without creating a duplicate record or new order number
      assert.strictEqual(order2.id, order1.id)
      assert.strictEqual(order2.order_number, order1.order_number)
      assert.strictEqual(order2.final_price, 15000)

      // Check total orders in store for company: must be exactly 1
      const allOrders = await OrderRepository.getOrders(companyId)
      assert.strictEqual(allOrders.length, 1)
    })
  })

  describe('3. Production Persistence Fail-Closed Verification', () => {
    it('Order creation in production mode throws error when database is unreachable instead of silently falling back to RAM', async () => {
      const originalMode = process.env.FINANCIAL_PERSISTENCE_MODE
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      try {
        process.env.FINANCIAL_PERSISTENCE_MODE = 'production'
        // Point to unreachable Supabase to simulate network / DB outage
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:59999'

        await assert.rejects(
          async () => {
            await OrderRepository.createOrder({
              company_id: 'c-fake',
              customer_id: 'cust-fake',
              customer_name: 'Outage Customer',
              customer_phone: '+8801999999999',
              delivery_date: '2026-10-05',
              final_price: 5000,
              salesperson_name: 'Rep',
              items: [],
            })
          },
          (err: any) => {
            assert.ok(err.message.includes('Database order creation failed'))
            return true
          }
        )
      } finally {
        if (originalMode) {
          process.env.FINANCIAL_PERSISTENCE_MODE = originalMode
        } else {
          delete process.env.FINANCIAL_PERSISTENCE_MODE
        }
        if (originalUrl) {
          process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
        }
      }
    })
  })

  describe('4. Input Validation & Boundary Defense Verification', () => {
    it('InvoiceCreateSchema rejects malformed payloads with negative values or missing fields', () => {
      const invalidRes = InvoiceCreateSchema.safeParse({
        customer_id: 'cust-1',
        due_date: '2026-10-15',
        subtotal: -500, // Negative subtotal
        vat_percentage: 0,
        discount_amount: 0,
        items: [], // Missing items
      })
      assert.strictEqual(invalidRes.success, false)

      const validRes = InvoiceCreateSchema.safeParse({
        customer_id: 'cust-1',
        due_date: '2026-10-15',
        subtotal: 5000,
        vat_percentage: 15,
        discount_amount: 0,
        items: [
          {
            description: 'Printing Material',
            quantity: 10,
            unit_price: 500,
          },
        ],
      })
      assert.strictEqual(validRes.success, true)
    })

    it('PaymentRecordSchema rejects invalid payment amounts and unlisted methods', () => {
      const invalidRes = PaymentRecordSchema.safeParse({
        customer_id: 'cust-1',
        amount: -500, // Negative payment
        payment_method: 'invalid_crypto_wallet',
        payment_date: '2026-10-01',
        receipt_number: 'REC-001',
        received_by_name: 'Cashier',
      })
      assert.strictEqual(invalidRes.success, false)

      const validRes = PaymentRecordSchema.safeParse({
        customer_id: 'cust-1',
        amount: 5000,
        payment_method: 'bkash',
        payment_date: '2026-10-01',
        receipt_number: 'REC-001',
        received_by_name: 'Cashier',
      })
      assert.strictEqual(validRes.success, true)
    })
  })

  describe('5. Configuration Safety & Feature-Flag Kill-Switch Verification', () => {
    it('getFinancialPersistenceMode throws error in production when Supabase is not configured', async () => {
      const { getFinancialPersistenceMode } = await import('../../lib/repositories/billing.repository.ts')
      const origNodeEnv = process.env.NODE_ENV
      const origMode = process.env.FINANCIAL_PERSISTENCE_MODE
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      try {
        ;(process.env as any).NODE_ENV = 'production'
        delete process.env.FINANCIAL_PERSISTENCE_MODE
        delete process.env.NEXT_PUBLIC_SUPABASE_URL
        delete process.env.SUPABASE_URL
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        delete process.env.SUPABASE_ANON_KEY
        delete process.env.SUPABASE_PUBLISHABLE_KEY

        assert.throws(
          () => {
            getFinancialPersistenceMode()
          },
          (err: any) => {
            assert.ok(err.message.includes('FAIL CLOSED: Supabase database configuration is missing'))
            return true
          }
        )
      } finally {
        ;(process.env as any).NODE_ENV = origNodeEnv
        if (origMode) process.env.FINANCIAL_PERSISTENCE_MODE = origMode
        if (origUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl
        if (origKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey
      }
    })

    it('WhatsApp webhook endpoint rejects invalid token with 403', async () => {
      const { GET: webhookGet } = await import('../../app/api/webhooks/[provider]/route.ts')
      const req = new Request(
        'http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=unauthorized_token&hub.challenge=test_challenge'
      )
      const res = await webhookGet(req as any, { params: Promise.resolve({ provider: 'whatsapp' }) })
      assert.strictEqual(res.status, 403)
    })

    it('EntitlementService respects emergency platform kill-switch feature flags', async () => {
      const { EntitlementService } = await import('../../services/entitlement.service.ts')
      const { PrintERPDataStore, STORAGE_KEYS } = await import('../../lib/db/data-store.ts')

      const originalFlags = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_FEATURE_FLAGS) || []

      try {
        // Explicitly disable whatsapp_notifications at platform level
        PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_FEATURE_FLAGS, [
          { key: 'whatsapp_notifications', is_enabled: false },
        ])

        const canUse = await EntitlementService.canUseFeature('tenant-test-1', 'whatsapp_notifications' as any)
        assert.strictEqual(canUse, false, 'Globally disabled feature must return false regardless of tenant plan')
      } finally {
        PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_FEATURE_FLAGS, originalFlags)
      }
    })
  })
})

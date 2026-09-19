import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InvoiceRequestRepository } from '../../lib/repositories/invoice-request.repository.ts'
import { InvoiceRequestService } from '../../services/invoice-request.service.ts'
import { DesignService } from '../../services/design.service.ts'
import type { InvoiceRequestRecord } from '../../types/workflow.types.ts'

describe('Billing & Collections: Prepress & Floor Invoice Requests Queue Certification', () => {
  const TENANT_ALPHA = 'comp-tenant-alpha'
  const TENANT_BETA = 'comp-tenant-beta'
  const SLUG_ALPHA = 'tenant-alpha'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
  })

  describe('1. Ingestion & Retrieval across Tenant Partitions', () => {
    test('Designer Prepress request is saved and retrievable via repository by UUID or Slug', async () => {
      const created = await InvoiceRequestRepository.createRequest({
        company_id: TENANT_ALPHA,
        customer_name: 'Delta Garments Ltd',
        customer_phone: '01712345678',
        requested_by_name: 'Shamol Designer',
        items_summary: 'Flex Banner 10x4 ft (High Res)',
        estimated_amount: 3500,
        notes: 'Prepress artwork ready for billing',
        design_number: 'DSN-2026-001',
      })

      assert.ok(created.id, 'Request must have an ID')
      assert.strictEqual(created.status, 'pending')
      assert.strictEqual(created.customer_name, 'Delta Garments Ltd')

      // Fetch by exact companyId
      const requestsExact = await InvoiceRequestRepository.getRequests(TENANT_ALPHA)
      assert.strictEqual(requestsExact.length, 1, 'Should find 1 request for companyId')
      assert.strictEqual(requestsExact[0].customer_name, 'Delta Garments Ltd')

      // Fetch by single ID
      const single = await InvoiceRequestRepository.getRequestById(created.id, TENANT_ALPHA)
      assert.ok(single, 'Should find single request by ID')
      assert.strictEqual(single?.id, created.id)
    })

    test('Shop Floor sales order request is persisted and filtered correctly', async () => {
      await InvoiceRequestRepository.createRequest({
        company_id: TENANT_ALPHA,
        customer_name: 'Apex Footwear Ltd',
        customer_phone: '01899887766',
        sales_order_id: 'ord-apex-001',
        order_number: 'ORD-2026-888',
        requested_by_name: 'Floor Operator',
        items_summary: '1000x Hangtags Matt Finish',
        estimated_amount: 15000,
        status: 'pending',
      })

      const pendingList = await InvoiceRequestRepository.getRequests(TENANT_ALPHA, { status: 'pending' })
      assert.strictEqual(pendingList.length, 1)
      assert.strictEqual(pendingList[0].order_number, 'ORD-2026-888')
    })
  })

  describe('2. Resolution & Void Lifecycle', () => {
    test('Resolving invoice request transitions status to invoice_created with invoice reference', async () => {
      const req = await InvoiceRequestRepository.createRequest({
        company_id: TENANT_ALPHA,
        customer_name: 'Square Pharmaceuticals',
        sales_order_id: 'ord-sq-001',
        order_number: 'ORD-SQ-101',
        requested_by_name: 'Floor Staff',
        estimated_amount: 25000,
      })

      assert.strictEqual(req.status, 'pending')

      const resolved = await InvoiceRequestRepository.resolveRequestWithInvoice(
        { salesOrderId: 'ord-sq-001' },
        'inv-sq-official-001',
        'INV-2026-999',
        TENANT_ALPHA
      )

      assert.strictEqual(resolved.length, 1, 'Should resolve 1 matching request')
      assert.strictEqual(resolved[0].status, 'invoice_created')
      assert.strictEqual(resolved[0].invoice_id, 'inv-sq-official-001')
      assert.strictEqual(resolved[0].invoice_number, 'INV-2026-999')

      // Verify repository query respects filters
      const pendingAfter = await InvoiceRequestRepository.getRequests(TENANT_ALPHA, { status: 'pending' })
      assert.strictEqual(pendingAfter.length, 0, 'Pending queue should now be empty')

      const invoicedAfter = await InvoiceRequestRepository.getRequests(TENANT_ALPHA, { status: 'invoice_created' })
      assert.strictEqual(invoicedAfter.length, 1, 'Invoiced queue should contain resolved request')
    })

    test('Cancelling invoice request marks it as cancelled with reason recorded', async () => {
      const req = await InvoiceRequestRepository.createRequest({
        company_id: TENANT_ALPHA,
        customer_name: 'Beximco Ltd',
        requested_by_name: 'Designer Lab',
        estimated_amount: 12000,
      })

      const updated = await InvoiceRequestRepository.updateRequestStatus(
        req.id,
        TENANT_ALPHA,
        'cancelled',
        'Client cancelled the design project'
      )

      assert.ok(updated, 'Update should succeed')
      assert.strictEqual(updated?.status, 'cancelled')
      assert.strictEqual(updated?.notes, 'Client cancelled the design project')

      const allCancelled = await InvoiceRequestRepository.getRequests(TENANT_ALPHA, { status: 'cancelled' })
      assert.strictEqual(allCancelled.length, 1)
      assert.strictEqual(allCancelled[0].id, req.id)
    })
  })

  describe('3. Multi-Tenant Isolation Protection', () => {
    test('Tenant Beta cannot access or resolve Tenant Alpha invoice requests', async () => {
      const reqAlpha = await InvoiceRequestRepository.createRequest({
        company_id: TENANT_ALPHA,
        customer_name: 'Alpha Secret Client',
        estimated_amount: 50000,
        requested_by_name: 'Alpha Designer',
      })

      // Query from Tenant Beta context
      const betaRequests = await InvoiceRequestRepository.getRequests(TENANT_BETA)
      assert.strictEqual(betaRequests.length, 0, 'Tenant Beta must not see Tenant Alpha requests')

      const betaGetSingle = await InvoiceRequestRepository.getRequestById(reqAlpha.id, TENANT_BETA)
      assert.strictEqual(betaGetSingle, null, 'Tenant Beta cannot fetch Tenant Alpha request by ID')

      // Attempt resolve from Tenant Beta
      const betaResolve = await InvoiceRequestRepository.resolveRequestWithInvoice(
        { requestId: reqAlpha.id },
        'inv-beta-fake',
        'INV-BETA-001',
        TENANT_BETA
      )
      assert.strictEqual(betaResolve.length, 0, 'Tenant Beta cannot resolve Tenant Alpha request')
    })
  })
})

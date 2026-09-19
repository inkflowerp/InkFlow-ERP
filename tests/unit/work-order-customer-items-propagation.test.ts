import test, { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InvoiceRequestService } from '../../services/invoice-request.service.ts'
import { InvoiceRequestRepository } from '../../lib/repositories/invoice-request.repository.ts'

describe('Work Order Modal Customer Info & Multi-Item Specs Propagation', () => {
  const companyAlpha = 'comp-tenant-alpha'

  beforeEach(() => {
    PrintERPDataStore.clear(STORAGE_KEYS.INVOICE_REQUESTS)
    PrintERPDataStore.clear(STORAGE_KEYS.ORDERS)
    PrintERPDataStore.clear(STORAGE_KEYS.DESIGN_JOBS)
  })

  it('1. Persists all Image 1 customer information fields on invoice request creation', async () => {
    const customerPayload = {
      companyId: companyAlpha,
      customerName: 'Anik Rahman',
      customerPhone: '01711223344',
      customerEmail: 'anik@acme-corp.com',
      customerAddress: 'House 42, Road 11, Banani, Dhaka',
      companyName: 'Acme Media & Advertising Ltd.',
      itemsSummary: 'Eco Solvent Ink (Black) (4×6 ft, Qty: 2); Backlit Signboard (10×4 ft, Qty: 1)',
      items: [
        {
          productId: 'prod-eco-ink-01',
          itemName: 'Eco Solvent Ink (Black)',
          item_kind: 'service',
          width: '4',
          height: '6',
          dimension_unit: 'ft',
          quantity: 2,
          unit: 'sft',
          finishing: 'None',
          design_required: false,
        },
        {
          productId: 'prod-backlit-02',
          itemName: 'Backlit Signboard',
          item_kind: 'service',
          width: '10',
          height: '4',
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          finishing: 'Eyelets / Grommets (চারপাশে রিং)',
          design_required: true,
        },
      ],
      estimatedAmount: 2400,
      notes: 'Urgent prepress proof required before evening printing.',
    }

    const created = await InvoiceRequestService.createInvoiceRequest(customerPayload)

    assert.ok(created.id, 'Request ID should be generated')
    assert.equal(created.customer_name, 'Anik Rahman')
    assert.equal(created.customer_phone, '01711223344')
    assert.equal(created.customer_email, 'anik@acme-corp.com')
    assert.equal(created.customer_address, 'House 42, Road 11, Banani, Dhaka')
    assert.equal(created.company_name, 'Acme Media & Advertising Ltd.')
    assert.equal(created.status, 'pending')
    assert.ok(Array.isArray(created.items), 'Items array must be persisted')
    assert.equal(created.items?.length, 2)
    assert.equal(created.items?.[0].itemName, 'Eco Solvent Ink (Black)')
    assert.equal(created.items?.[0].quantity, 2)
    assert.equal(created.items?.[1].itemName, 'Backlit Signboard')
    assert.equal(created.items?.[1].finishing, 'Eyelets / Grommets (চারপাশে রিং)')
    assert.equal(created.items?.[1].design_required, true)
  })

  it('2. Retrieves invoice request with full items payload for pre-filling NewInvoiceModal', async () => {
    const created = await InvoiceRequestRepository.createRequest({
      company_id: companyAlpha,
      customer_name: 'Shakil Ahmed',
      customer_phone: '01899887766',
      customer_email: 'shakil@printpress.bd',
      customer_address: 'Motijheel C/A, Dhaka-1000',
      company_name: 'Fast Track Printing Hub',
      items_summary: 'Pana Flex Banner Print (20×10 ft, Qty: 1)',
      items: [
        {
          productId: 'prod-pana-flex',
          itemName: 'Pana Flex Banner Print',
          item_kind: 'service',
          width: '20',
          height: '10',
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          finishing: 'Pocket / Pole Seaming (পাইপ পকেট)',
          design_required: false,
        },
      ],
      estimated_amount: 5000,
      requested_by_name: 'Pre-Press Designer Labib',
    })

    const fetched = await InvoiceRequestRepository.getRequestById(created.id, companyAlpha)

    assert.ok(fetched, 'Request should be retrievable')
    assert.equal(fetched?.customer_name, 'Shakil Ahmed')
    assert.equal(fetched?.customer_email, 'shakil@printpress.bd')
    assert.equal(fetched?.customer_address, 'Motijheel C/A, Dhaka-1000')
    assert.equal(fetched?.company_name, 'Fast Track Printing Hub')
    assert.equal(fetched?.items?.length, 1)
    assert.equal(fetched?.items?.[0].width, '20')
    assert.equal(fetched?.items?.[0].height, '10')
    assert.equal(fetched?.items?.[0].finishing, 'Pocket / Pole Seaming (পাইপ পকেট)')
  })
})

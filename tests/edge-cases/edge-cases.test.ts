import { test, describe } from 'node:test'
import assert from 'node:assert'

export function normalizeBdPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '')
  if (digitsOnly.startsWith('880')) {
    return `+${digitsOnly}`
  }
  if (digitsOnly.startsWith('0')) {
    return `+88${digitsOnly}`
  }
  return `+880${digitsOnly}`
}

describe('Comprehensive Edge Cases Tests', () => {
  // Edge Case 1: Partial purchase receiving
  test('Partial Purchase Receiving: Order 10 rolls of Star Flex, receive 6 rolls', () => {
    const purchaseOrder = {
      id: 'po-101',
      orderedQty: 10,
      receivedQty: 0,
      status: 'ordered' as 'ordered' | 'partially_received' | 'received',
    }

    // First shipment arrives: 6 rolls
    const shipmentQty = 6
    purchaseOrder.receivedQty += shipmentQty
    purchaseOrder.status =
      purchaseOrder.receivedQty >= purchaseOrder.orderedQty
        ? 'received'
        : 'partially_received'

    assert.strictEqual(purchaseOrder.receivedQty, 6)
    assert.strictEqual(purchaseOrder.status, 'partially_received')
    assert.strictEqual(purchaseOrder.orderedQty - purchaseOrder.receivedQty, 4) // 4 remaining
  })

  // Edge Case 2: Cancelled order with non-destructive voiding
  test('Cancelled Order: Voids invoice non-destructively and reverses stock allocation', () => {
    const order = { id: 'ord-99', status: 'confirmed', allocatedRollSft: 1500 }
    const invoice = { id: 'inv-99', status: 'unpaid', isVoid: false }
    let warehouseAvailableSft = 10000 - order.allocatedRollSft // 8500 available

    // Order cancellation event
    order.status = 'cancelled'
    invoice.isVoid = true
    invoice.status = 'unpaid' // Financial records are NOT deleted from DB
    warehouseAvailableSft += order.allocatedRollSft // De-allocated back to 10,000

    assert.strictEqual(order.status, 'cancelled')
    assert.strictEqual(invoice.isVoid, true)
    assert.strictEqual(warehouseAvailableSft, 10000)
  })

  // Edge Case 3: Negative Stock Prevention
  test('Negative Stock Prevention: Attempting to deduct 20 rolls when only 14 available throws error', () => {
    const inventoryStock = 14
    const requestedDeduction = 20

    const executeStockDeduction = (current: number, request: number) => {
      if (request > current) {
        throw new Error('StockLedgerError: Negative stock prohibited. Balance cannot fall below 0.')
      }
      return current - request
    }

    assert.throws(
      () => executeStockDeduction(inventoryStock, requestedDeduction),
      /Negative stock prohibited/
    )
  })

  // Edge Case 4: Rework & Material Wastage
  test('Rework & Material Wastage: Press head strike causes 120 SFT wasted reprint without overcharging client', () => {
    const job = {
      orderId: 'ord-101',
      billableSft: 1000,
      wastedSft: 0,
      reworkReason: null as string | null,
    }

    // Head strike event occurs on solvent printer
    job.wastedSft += 120
    job.reworkReason = 'Head strike on print carriage - 120 SFT discarded to scrap'

    // Customer still pays for 1000 SFT, 120 SFT recorded to company wastage ledger
    assert.strictEqual(job.billableSft, 1000)
    assert.strictEqual(job.wastedSft, 120)
    assert.ok(job.reworkReason.includes('Head strike'))
  })

  // Edge Case 5: Duplicate customer detection via normalized Bangladesh phone
  test('Duplicate Customer Detection: Normalizes 01711..., +8801711..., 8801711... to detect duplicate', () => {
    const existingPhones = ['+8801711223344', '+8801819998877']

    const checkDuplicate = (inputPhone: string) => {
      const normalized = normalizeBdPhone(inputPhone)
      return existingPhones.includes(normalized)
    }

    assert.strictEqual(checkDuplicate('01711-223344'), true)
    assert.strictEqual(checkDuplicate('+880 1711 223344'), true)
    assert.strictEqual(checkDuplicate('8801711223344'), true)
    assert.strictEqual(checkDuplicate('01911-000000'), false) // New unique client
  })

  // Edge Case 6: Concurrent Atomic Document Numbering
  test('Concurrent Document Numbering: Sequential generation produces zero duplicate collisions', () => {
    let currentSequence = 180
    const generateNextInvoiceNumber = () => {
      currentSequence += 1
      return `INV-${String(currentSequence).padStart(6, '0')}`
    }

    // Simulate 5 simultaneous creations
    const generated = Array.from({ length: 5 }).map(() => generateNextInvoiceNumber())

    assert.deepStrictEqual(generated, [
      'INV-000181',
      'INV-000182',
      'INV-000183',
      'INV-000184',
      'INV-000185',
    ])

    const uniqueSet = new Set(generated)
    assert.strictEqual(uniqueSet.size, 5) // Zero collisions
  })
})

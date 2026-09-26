import { test, describe } from 'node:test'
import assert from 'node:assert'
import { formatCustomerIdNo } from '../../lib/formatters.ts'

describe('Customer ID Generation and Formatting Unit Tests', () => {
  test('1. Respects persistent customer_id_no with highest priority', () => {
    const customer = {
      id: '90cd8139-e000-471f-85b3-5bdd07a7a609',
      customer_id_no: 'CUST-0001',
      customer_code: 'APX-01',
    }

    assert.strictEqual(formatCustomerIdNo(customer), 'CUST-0001')
  })

  test('2. Uses customer_code when customer_id_no is not provided', () => {
    const customer = {
      id: '90cd8139-e000-471f-85b3-5bdd07a7a609',
      customer_code: 'BEX-99',
    }

    assert.strictEqual(formatCustomerIdNo(customer), 'BEX-99')
  })

  test('3. Fixes legacy bug where cust-01 became CUST-ST01', () => {
    // In the old buggy implementation: "cust-01".replace(/-/g, '').slice(-4) became "st01" -> "CUST-ST01"
    // With canonical implementation, "cust-01" must format to "CUST-001"
    const customer = {
      id: 'cust-01',
    }

    assert.strictEqual(formatCustomerIdNo(customer), 'CUST-001')
    assert.notStrictEqual(formatCustomerIdNo(customer), 'CUST-ST01')
  })

  test('4. Fixes legacy bug where cust-1 became CUST-UST1', () => {
    // In the old buggy implementation: "cust-1".replace(/-/g, '').slice(-4) became "ust1" -> "CUST-UST1"
    const customer = {
      id: 'cust-1',
    }

    assert.strictEqual(formatCustomerIdNo(customer), 'CUST-001')
    assert.notStrictEqual(formatCustomerIdNo(customer), 'CUST-UST1')
  })

  test('5. Formats numeric sequences with zero padding up to 3 digits', () => {
    assert.strictEqual(formatCustomerIdNo({ id: 'c-5' }), 'CUST-005')
    assert.strictEqual(formatCustomerIdNo({ id: 'cust-42' }), 'CUST-042')
    assert.strictEqual(formatCustomerIdNo({ id: 'cust-1234' }), 'CUST-1234')
  })

  test('6. Formats clean alphanumeric slugs without corrupting', () => {
    assert.strictEqual(formatCustomerIdNo({ id: 'cust-beximco' }), 'CUST-BEXIMCO')
    assert.strictEqual(formatCustomerIdNo({ id: 'cust-acme-corp' }), 'CUST-ACME-CORP')
  })

  test('7. Deterministically formats raw UUIDs when unmigrated', () => {
    const customer = {
      id: '90cd8139-e000-471f-85b3-5bdd07a7a609',
    }

    // Canonical formatter uses first 6 chars deterministically
    assert.strictEqual(formatCustomerIdNo(customer), 'CUST-90CD81')
  })

  test('8. Handles index fallback when customer has no id', () => {
    assert.strictEqual(formatCustomerIdNo({}, 0), 'CUST-001')
    assert.strictEqual(formatCustomerIdNo({}, 9), 'CUST-010')
  })
})

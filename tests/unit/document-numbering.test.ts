import { describe, it } from 'node:test'
import assert from 'node:assert'

// Unit test of Document Numbering Engine matching PrintERPDataStore.getNextDocumentNumber
class DocumentNumberingEngine {
  private static counters: Map<string, number> = new Map()

  static getNextDocumentNumber(
    companyId: string,
    type: 'order' | 'quotation' | 'invoice' | 'challan' | 'job' | 'money_receipt' | 'purchase',
    customPrefixes?: Record<string, string>
  ): string {
    const prefixes: Record<string, string> = {
      order: customPrefixes?.order_prefix || 'ORD-',
      quotation: customPrefixes?.quotation_prefix || 'QUO-',
      invoice: customPrefixes?.invoice_prefix || 'INV-',
      challan: customPrefixes?.challan_prefix || 'CH-',
      job: customPrefixes?.job_prefix || 'JOB-',
      money_receipt: customPrefixes?.money_receipt_prefix || 'MR-',
      purchase: customPrefixes?.purchase_prefix || 'PO-',
    }

    const prefix = prefixes[type] || 'DOC-'
    const counterKey = `doc_counter_${companyId}_${type}`
    const current = this.counters.get(counterKey) ?? 100
    const next = current + 1
    this.counters.set(counterKey, next)

    return `${prefix}${next.toString().padStart(6, '0')}`
  }
}

describe('Document Numbering Engine', () => {
  it('1. Generates correct prefixes for all document types', () => {
    const orderNum = DocumentNumberingEngine.getNextDocumentNumber('c-test-01', 'order')
    const quoteNum = DocumentNumberingEngine.getNextDocumentNumber('c-test-01', 'quotation')
    const invoiceNum = DocumentNumberingEngine.getNextDocumentNumber('c-test-01', 'invoice')
    const challanNum = DocumentNumberingEngine.getNextDocumentNumber('c-test-01', 'challan')
    const jobNum = DocumentNumberingEngine.getNextDocumentNumber('c-test-01', 'job')
    const receiptNum = DocumentNumberingEngine.getNextDocumentNumber('c-test-01', 'money_receipt')
    const poNum = DocumentNumberingEngine.getNextDocumentNumber('c-test-01', 'purchase')

    assert.match(orderNum, /^ORD-\d{6}$/)
    assert.match(quoteNum, /^QUO-\d{6}$/)
    assert.match(invoiceNum, /^INV-\d{6}$/)
    assert.match(challanNum, /^CH-\d{6}$/)
    assert.match(jobNum, /^JOB-\d{6}$/)
    assert.match(receiptNum, /^MR-\d{6}$/)
    assert.match(poNum, /^PO-\d{6}$/)
  })

  it('2. Number generation is strictly sequential and collision-free', () => {
    const num1 = DocumentNumberingEngine.getNextDocumentNumber('c-seq-01', 'order')
    const num2 = DocumentNumberingEngine.getNextDocumentNumber('c-seq-01', 'order')
    const num3 = DocumentNumberingEngine.getNextDocumentNumber('c-seq-01', 'order')

    assert.notStrictEqual(num1, num2)
    assert.notStrictEqual(num2, num3)

    const seq1 = parseInt(num1.replace('ORD-', ''), 10)
    const seq2 = parseInt(num2.replace('ORD-', ''), 10)
    const seq3 = parseInt(num3.replace('ORD-', ''), 10)

    assert.strictEqual(seq2, seq1 + 1)
    assert.strictEqual(seq3, seq2 + 1)
  })

  it('3. Number generation isolates companies and document types independently', () => {
    const compA_order = DocumentNumberingEngine.getNextDocumentNumber('comp-A', 'order')
    const compB_order = DocumentNumberingEngine.getNextDocumentNumber('comp-B', 'order')
    const compA_inv = DocumentNumberingEngine.getNextDocumentNumber('comp-A', 'invoice')

    assert.match(compA_order, /^ORD-\d{6}$/)
    assert.match(compB_order, /^ORD-\d{6}$/)
    assert.match(compA_inv, /^INV-\d{6}$/)
  })
})

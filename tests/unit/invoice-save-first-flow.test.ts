import { test, describe } from 'node:test'
import assert from 'node:assert'

/**
 * Save-First Workflow Pipeline Simulator
 */
export async function executeSaveFirstPipeline(params: {
  action: 'save' | 'print' | 'send'
  invoicePayload: {
    customerName: string
    subtotal: number
    grandTotal: number
  }
  channel?: 'whatsapp' | 'email' | 'sms'
  simulatePersistenceSuccess: boolean
  simulateChannelSendSuccess?: boolean
}): Promise<{
  persisted: boolean
  invoiceId?: string
  invoiceNumber?: string
  printReady: boolean
  sendSuccess: boolean
  error?: string
  retryableSend: boolean
}> {
  // Step 1: Mandatory Persistence
  if (!params.simulatePersistenceSuccess) {
    return {
      persisted: false,
      printReady: false,
      sendSuccess: false,
      error: 'Database connection failure during invoice persistence',
      retryableSend: false,
    }
  }

  const invoiceId = `inv-${Date.now()}`
  const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`

  // If action is pure save
  if (params.action === 'save') {
    return {
      persisted: true,
      invoiceId,
      invoiceNumber,
      printReady: false,
      sendSuccess: false,
      retryableSend: false,
    }
  }

  // If action is print
  if (params.action === 'print') {
    // Print document is only generated AFTER confirmed database persistence
    return {
      persisted: true,
      invoiceId,
      invoiceNumber,
      printReady: true,
      sendSuccess: false,
      retryableSend: false,
    }
  }

  // If action is send (WhatsApp / Email / SMS)
  if (params.action === 'send') {
    if (params.simulateChannelSendSuccess === false) {
      // Persistence was successful, but provider dispatch failed
      return {
        persisted: true,
        invoiceId,
        invoiceNumber,
        printReady: false,
        sendSuccess: false,
        error: `Invoice ${invoiceNumber} saved successfully, but ${params.channel?.toUpperCase()} gateway timed out`,
        retryableSend: true,
      }
    }

    return {
      persisted: true,
      invoiceId,
      invoiceNumber,
      printReady: false,
      sendSuccess: true,
      retryableSend: false,
    }
  }

  return {
    persisted: true,
    invoiceId,
    invoiceNumber,
    printReady: false,
    sendSuccess: false,
    retryableSend: false,
  }
}

describe('Save-First Architecture & Communication Resilience', () => {
  test('Save action persists invoice and returns authoritative invoice number', async () => {
    const res = await executeSaveFirstPipeline({
      action: 'save',
      invoicePayload: { customerName: 'Apex Footwear', subtotal: 50000, grandTotal: 50000 },
      simulatePersistenceSuccess: true,
    })

    assert.strictEqual(res.persisted, true)
    assert.ok(res.invoiceId)
    assert.ok(res.invoiceNumber?.startsWith('INV-'))
    assert.strictEqual(res.sendSuccess, false)
  })

  test('Print action mandates persistence before generating print view', async () => {
    const res = await executeSaveFirstPipeline({
      action: 'print',
      invoicePayload: { customerName: 'Square Pharma', subtotal: 80000, grandTotal: 88000 },
      simulatePersistenceSuccess: true,
    })

    assert.strictEqual(res.persisted, true)
    assert.strictEqual(res.printReady, true)
    assert.ok(res.invoiceId)
  })

  test('Print action aborts and does not generate print document if persistence fails', async () => {
    const res = await executeSaveFirstPipeline({
      action: 'print',
      invoicePayload: { customerName: 'Square Pharma', subtotal: 80000, grandTotal: 88000 },
      simulatePersistenceSuccess: false,
    })

    assert.strictEqual(res.persisted, false)
    assert.strictEqual(res.printReady, false)
    assert.ok(res.error)
  })

  test('Send action persists invoice before dispatching WhatsApp/Email/SMS', async () => {
    const res = await executeSaveFirstPipeline({
      action: 'send',
      channel: 'whatsapp',
      invoicePayload: { customerName: 'Akij Group', subtotal: 12000, grandTotal: 12000 },
      simulatePersistenceSuccess: true,
      simulateChannelSendSuccess: true,
    })

    assert.strictEqual(res.persisted, true)
    assert.strictEqual(res.sendSuccess, true)
    assert.strictEqual(res.retryableSend, false)
  })

  test('Preserves saved invoice when communication channel dispatch fails, enabling retry', async () => {
    const res = await executeSaveFirstPipeline({
      action: 'send',
      channel: 'whatsapp',
      invoicePayload: { customerName: 'Beximco', subtotal: 45000, grandTotal: 45000 },
      simulatePersistenceSuccess: true,
      simulateChannelSendSuccess: false, // Network timeout to WhatsApp
    })

    // CRITICAL: Invoice MUST remain saved!
    assert.strictEqual(res.persisted, true)
    assert.ok(res.invoiceId)
    assert.strictEqual(res.sendSuccess, false)
    assert.strictEqual(res.retryableSend, true)
    assert.ok(res.error?.includes('saved successfully, but WHATSAPP gateway timed out'))
  })
})

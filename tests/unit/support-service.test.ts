import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SupportService } from '../../services/support.service.ts'

describe('SupportService Unit Tests', () => {
  const companyAlphaId = 'company-tenant-alpha'
  const companyBetaId = 'company-tenant-beta'
  const userAlphaId = 'usr-tenant-alpha-001'
  const adminId = 'admin-staff-001'

  test('1. Generates unique, sequential ticket number with prefix SUP-', async () => {
    const num1 = await SupportService.generateTicketNumber()
    const num2 = await SupportService.generateTicketNumber()

    assert.ok(num1.startsWith('SUP-'), 'Ticket number must start with SUP-')
    assert.ok(num2.startsWith('SUP-'), 'Ticket number must start with SUP-')
    assert.notStrictEqual(num1, num2, 'Consecutive ticket numbers must be unique')
  })

  test('2. Tenant user creates conversation with initial message and category', async () => {
    const res = await SupportService.createConversation(
      companyAlphaId,
      'Alpha Signage Ltd',
      'alpha-signage',
      userAlphaId,
      'owner@alpha.com',
      'Rahim Ahmed',
      {
        subject: 'Cannot generate Mushak 6.3 Challan for Order ORD-001',
        category: 'invoice',
        priority: 'high',
        initialMessage: 'When clicking print challan, the system returns a calculation warning.',
      }
    )

    assert.strictEqual(res.success, true)
    assert.ok(res.data)
    assert.strictEqual(res.data.company_id, companyAlphaId)
    assert.strictEqual(res.data.status, 'open')
    assert.strictEqual(res.data.priority, 'high')
    assert.strictEqual(res.data.category, 'invoice')
    assert.strictEqual(res.data.created_by, userAlphaId)
    assert.strictEqual(res.data.unread_platform_count, 1)
    assert.strictEqual(res.data.unread_tenant_count, 0)
  })

  test('3. Strict Internal Note privacy: Internal notes are omitted from tenant queries', async () => {
    // 1. Create ticket
    const convRes = await SupportService.createConversation(
      companyAlphaId,
      'Alpha Signage Ltd',
      'alpha-signage',
      userAlphaId,
      'owner@alpha.com',
      'Rahim Ahmed',
      {
        subject: 'Printer driver offline',
        category: 'production',
        initialMessage: 'Floor terminal 2 is disconnected.',
      }
    )
    const convId = convRes.data!.id

    // 2. Staff adds internal note
    await SupportService.sendPlatformReply(adminId, 'agent@printerp.com', 'Agent Tareq', {
      conversationId: convId,
      body: 'INTERNAL NOTE: Checked gateway, tenant IP was blocked on firewall.',
      isInternalNote: true,
    })

    // 3. Staff adds public reply
    await SupportService.sendPlatformReply(adminId, 'agent@printerp.com', 'Agent Tareq', {
      conversationId: convId,
      body: 'We have refreshed your terminal connection. Please restart the agent app.',
      isInternalNote: false,
    })

    // 4. Query as tenant: MUST NOT CONTAIN internal note!
    const tenantDetails = await SupportService.getTenantConversationDetails(companyAlphaId, convId)
    assert.strictEqual(tenantDetails.success, true)
    const tenantMsgs = tenantDetails.data!.messages
    const hasInternalNote = tenantMsgs.some((m) => m.message_type === 'internal_note')
    assert.strictEqual(hasInternalNote, false, 'Tenant must never receive internal notes')
    assert.strictEqual(tenantMsgs.length, 2, 'Tenant should see initial message + public reply only')

    // 5. Query as platform staff: MUST contain internal note!
    const platformDetails = await SupportService.getPlatformConversationDetails(convId)
    assert.strictEqual(platformDetails.success, true)
    const platformMsgs = platformDetails.data!.messages
    const foundNote = platformMsgs.find((m) => m.message_type === 'internal_note')
    assert.ok(foundNote, 'Platform staff must see internal note')
    assert.strictEqual(foundNote?.body.includes('INTERNAL NOTE'), true)
  })

  test('4. Status transitions: Reply from customer transitions waiting_customer back to in_progress', async () => {
    const convRes = await SupportService.createConversation(
      companyAlphaId,
      'Alpha Signage Ltd',
      'alpha-signage',
      userAlphaId,
      'owner@alpha.com',
      'Rahim Ahmed',
      {
        subject: 'Billing query',
        category: 'billing',
        initialMessage: 'Invoice has extra discount.',
      }
    )
    const convId = convRes.data!.id

    // Staff replies -> status becomes waiting_customer
    await SupportService.sendPlatformReply(adminId, 'agent@printerp.com', 'Agent Tareq', {
      conversationId: convId,
      body: 'Which invoice number are you referring to?',
      isInternalNote: false,
    })

    let currentConv = (await SupportService.getPlatformConversationDetails(convId)).data!.conversation
    assert.strictEqual(currentConv.status, 'waiting_customer')

    // Customer replies -> status transitions to in_progress
    await SupportService.sendTenantMessage(companyAlphaId, userAlphaId, 'owner@alpha.com', 'Rahim Ahmed', {
      conversationId: convId,
      body: 'It is Invoice #INV-00042.',
    })

    currentConv = (await SupportService.getPlatformConversationDetails(convId)).data!.conversation
    assert.strictEqual(currentConv.status, 'in_progress')
  })

  test('5. Support Queue Statistics and SLA metrics calculation', async () => {
    const stats = await SupportService.getPlatformSupportStats()
    assert.ok(typeof stats.totalCount === 'number')
    assert.ok(typeof stats.openCount === 'number')
    assert.ok(typeof stats.averageFirstResponseMinutes === 'number')
    assert.ok(typeof stats.averageResolutionMinutes === 'number')
  })
})

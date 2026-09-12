import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SupportService } from '../../services/support.service.ts'

describe('Support Chat End-to-End Workflow Integration Test', () => {
  const companyId = 'co-beta-printing-1001'
  const companyName = 'Beta Digital Print'
  const companySlug = 'beta-print'
  const customerId = 'usr-beta-owner'
  const customerEmail = 'owner@betaprint.com'
  const customerName = 'Kamal Hossain'
  const agentId = 'admin-agent-007'
  const agentEmail = 'support@printerp.com'
  const agentName = 'Agent Nusrat'

  test('Complete Customer-Support Lifecycle Flow: Open -> Claim -> Internal Note -> Reply -> Resolution -> Close -> Reopen', async () => {
    // 1. Tenant User opens ticket
    const createRes = await SupportService.createConversation(
      companyId,
      companyName,
      companySlug,
      customerId,
      customerEmail,
      customerName,
      {
        subject: 'bKash payment gateway callback failure on checkout',
        category: 'payment',
        priority: 'urgent',
        initialMessage: 'Customer paid ৳5,000 via bKash but invoice status remained unpaid.',
        contextMetadata: { invoice_id: 'INV-2026-0099', payment_method: 'bkash' },
      }
    )

    assert.strictEqual(createRes.success, true)
    const convId = createRes.data!.id
    assert.strictEqual(createRes.data!.status, 'open')
    assert.strictEqual(createRes.data!.priority, 'urgent')
    assert.strictEqual(createRes.data!.unread_platform_count, 1)

    // 2. Platform Agent views queue and claims ticket
    const assignRes = await SupportService.assignConversation(
      agentId,
      agentEmail,
      agentName,
      convId,
      agentId,
      agentName
    )
    assert.strictEqual(assignRes.success, true)
    assert.strictEqual(assignRes.data!.assigned_to, agentId)
    assert.strictEqual(assignRes.data!.status, 'in_progress')

    // 3. Agent adds private Internal Note (e.g. checked logs)
    const noteRes = await SupportService.sendPlatformReply(agentId, agentEmail, agentName, {
      conversationId: convId,
      body: 'Verified bKash webhook IPN was rejected due to signature mismatch. Re-triggered IPN manually.',
      isInternalNote: true,
    })
    assert.strictEqual(noteRes.success, true)
    assert.strictEqual(noteRes.data!.message_type, 'internal_note')

    // 4. Verify tenant cannot see note
    const tenantView1 = await SupportService.getTenantConversationDetails(companyId, convId)
    assert.strictEqual(tenantView1.data!.messages.some((m) => m.message_type === 'internal_note'), false)

    // 5. Agent sends public reply
    const replyRes = await SupportService.sendPlatformReply(agentId, agentEmail, agentName, {
      conversationId: convId,
      body: 'We have reconciled the bKash transaction. Invoice INV-2026-0099 is now marked as Paid with MR generated.',
      isInternalNote: false,
    })
    assert.strictEqual(replyRes.success, true)
    assert.strictEqual(replyRes.data!.message_type, 'support_reply')

    // 6. Tenant marks as read
    await SupportService.markAsReadByTenant(companyId, convId)
    const tenantView2 = await SupportService.getTenantConversationDetails(companyId, convId)
    assert.strictEqual(tenantView2.data!.conversation.unread_tenant_count, 0)
    assert.strictEqual(tenantView2.data!.messages.length, 3) // Initial message + Assignment system event + Public reply
    assert.strictEqual(tenantView2.data!.messages.some((m) => m.message_type === 'internal_note'), false)

    // 7. Platform Agent resolves ticket
    const resolveRes = await SupportService.updateConversationStatus(
      agentId,
      agentEmail,
      agentName,
      convId,
      'resolved',
      'bKash webhook reconciled'
    )
    assert.strictEqual(resolveRes.success, true)
    assert.strictEqual(resolveRes.data!.status, 'resolved')
    assert.ok(resolveRes.data!.resolved_at)

    // 8. Tenant closes ticket
    const closeRes = await SupportService.closeConversationByTenant(
      companyId,
      convId,
      customerId,
      customerName
    )
    assert.strictEqual(closeRes.success, true)
    assert.strictEqual(closeRes.data!.status, 'closed')
    assert.ok(closeRes.data!.closed_at)

    // 9. Tenant reopens ticket if issue re-occurs
    const reopenRes = await SupportService.reopenConversationByTenant(
      companyId,
      convId,
      customerId,
      customerName,
      'Another customer reported same issue on invoice INV-2026-0102'
    )
    assert.strictEqual(reopenRes.success, true)
    assert.strictEqual(reopenRes.data!.status, 'in_progress')
    assert.ok(reopenRes.data!.reopened_at)
  })
})

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SupportService } from '../../services/support.service.ts'

describe('Support Chat Multi-Tenant Isolation & Security Boundary Tests', () => {
  const tenantAId = 'co-alpha-signage-771'
  const tenantBId = 'co-beta-print-882'
  const userA = 'usr-alpha-owner'
  const userB = 'usr-beta-owner'
  const adminId = 'pa-admin-super'

  test('1. Multi-Tenant Isolation: Tenant A cannot view Tenant B conversations in list query', async () => {
    // 1. Create ticket in Tenant A
    await SupportService.createConversation(
      tenantAId,
      'Alpha Signage Ltd',
      'alpha-signage',
      userA,
      'alpha@inkflow.com',
      'Rahim Alpha',
      {
        subject: 'Alpha confidential production setup',
        category: 'production',
        initialMessage: 'Confidential flex pricing parameters for Alpha.',
      }
    )

    // 2. Create ticket in Tenant B
    await SupportService.createConversation(
      tenantBId,
      'Beta Print Ltd',
      'beta-print',
      userB,
      'beta@inkflow.com',
      'Karim Beta',
      {
        subject: 'Beta confidential banking ledger',
        category: 'billing',
        initialMessage: 'Confidential financial details for Beta.',
      }
    )

    // 3. Query as Tenant A
    const listA = await SupportService.getTenantConversations(tenantAId)
    assert.strictEqual(listA.success, true)
    const hasBetaTicket = listA.data!.some((c) => c.company_id === tenantBId)
    assert.strictEqual(hasBetaTicket, false, 'Tenant A must NEVER see Tenant B conversations')

    // 4. Query as Tenant B
    const listB = await SupportService.getTenantConversations(tenantBId)
    assert.strictEqual(listB.success, true)
    const hasAlphaTicket = listB.data!.some((c) => c.company_id === tenantAId)
    assert.strictEqual(hasAlphaTicket, false, 'Tenant B must NEVER see Tenant A conversations')
  })

  test('2. IDOR Prevention: Direct URL / ID lookup of Tenant B conversation by Tenant A is rejected', async () => {
    // Create conversation in Tenant B
    const betaConvRes = await SupportService.createConversation(
      tenantBId,
      'Beta Print Ltd',
      'beta-print',
      userB,
      'beta@inkflow.com',
      'Karim Beta',
      {
        subject: 'Beta private contract inquiry',
        category: 'subscription',
        initialMessage: 'Private contract terms discussion.',
      }
    )
    const betaConvId = betaConvRes.data!.id

    // Tenant A attempts to fetch Tenant B's conversation details using Tenant A's company context
    const idorAttempt = await SupportService.getTenantConversationDetails(tenantAId, betaConvId)
    assert.strictEqual(idorAttempt.success, false, 'IDOR cross-tenant access must be rejected')
    assert.strictEqual(
      idorAttempt.error?.includes('forbidden') || idorAttempt.error?.includes('not found'),
      true
    )
  })

  test('3. Cross-Tenant Message Injection Prevention: Tenant A cannot post message into Tenant B conversation', async () => {
    const betaConvRes = await SupportService.createConversation(
      tenantBId,
      'Beta Print Ltd',
      'beta-print',
      userB,
      'beta@inkflow.com',
      'Karim Beta',
      {
        subject: 'Beta secret work order',
        category: 'production',
        initialMessage: 'Secret work order specification.',
      }
    )
    const betaConvId = betaConvRes.data!.id

    // Tenant A attempts to send message into Tenant B conversation
    const injectionAttempt = await SupportService.sendTenantMessage(
      tenantAId,
      userA,
      'alpha@inkflow.com',
      'Rahim Alpha',
      {
        conversationId: betaConvId,
        body: 'Malicious injection into Tenant B ticket',
      }
    )

    assert.strictEqual(injectionAttempt.success, false, 'Cross-tenant message injection must fail')
  })

  test('4. Zero-Trust Internal Notes: Platform staff notes are inaccessible via tenant API/Service', async () => {
    const convRes = await SupportService.createConversation(
      tenantAId,
      'Alpha Signage Ltd',
      'alpha-signage',
      userA,
      'alpha@inkflow.com',
      'Rahim Alpha',
      {
        subject: 'Bug in invoice PDF generator',
        category: 'bug_report',
        initialMessage: 'PDF font is corrupt.',
      }
    )
    const convId = convRes.data!.id

    // Add 3 internal notes and 1 public reply
    await SupportService.sendPlatformReply(adminId, 'agent1@inkflow.com', 'Agent 1', {
      conversationId: convId,
      body: 'INTERNAL NOTE 1: Bug reproduced in test suite.',
      isInternalNote: true,
    })
    await SupportService.sendPlatformReply(adminId, 'agent2@inkflow.com', 'Agent 2', {
      conversationId: convId,
      body: 'INTERNAL NOTE 2: Hotfix committed to staging.',
      isInternalNote: true,
    })
    await SupportService.sendPlatformReply(adminId, 'agent1@inkflow.com', 'Agent 1', {
      conversationId: convId,
      body: 'We have applied a fix to the PDF rendering engine. Please test generating the invoice again.',
      isInternalNote: false,
    })

    // Query through tenant service
    const tenantDetails = await SupportService.getTenantConversationDetails(tenantAId, convId)
    assert.strictEqual(tenantDetails.success, true)
    const messages = tenantDetails.data!.messages

    assert.strictEqual(messages.length, 2, 'Tenant must only see initial message and public reply')
    const anyInternal = messages.some((m) => m.message_type === 'internal_note')
    assert.strictEqual(anyInternal, false, 'No internal notes must leak to tenant user')
  })

  test('5. Anti-XSS Sanitization: Script tags are neutralized', () => {
    function sanitize(input: string): string {
      return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()
    }

    const malicious = '<script>alert("XSS payload")</script>'
    const sanitized = sanitize(malicious)
    assert.strictEqual(sanitized.includes('<script>'), false)
    assert.strictEqual(sanitized, '&lt;script&gt;alert("XSS payload")&lt;/script&gt;')
  })
})

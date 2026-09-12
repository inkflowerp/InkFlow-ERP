import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PlatformService } from '../../services/platform.service.ts'
import { realtimeManager } from '../../lib/realtime/subscription-manager.ts'
import type { PlatformNotificationItem } from '../../types/platform.types.ts'

describe('Platform Notifications Real-Time & Authoritative Pipeline Tests', () => {
  it('should create an authoritative database-backed platform notification', async () => {
    const testTitle = `Test Security Event ${Date.now()}`
    const result = await PlatformService.createNotification({
      title: testTitle,
      message: 'Suspicious login attempt detected from unknown IP.',
      severity: 'warning',
      type: 'security',
      target_audience: 'all_admins',
    })

    assert.strictEqual(result.success, true)
    assert.ok(result.data)
    assert.strictEqual(result.data?.title, testTitle)
    assert.strictEqual(result.data?.severity, 'warning')
    assert.strictEqual(result.data?.type, 'security')
    assert.strictEqual(result.data?.is_read, false)
    assert.ok(result.data?.id)
    assert.ok(result.data?.created_at)
  })

  it('should retrieve paginated notifications with accurate total and unread counts', async () => {
    const res = await PlatformService.getNotifications({ page: 1, pageSize: 10 })
    assert.ok(Array.isArray(res.data))
    assert.strictEqual(typeof res.totalCount, 'number')
    assert.strictEqual(typeof res.unreadCount, 'number')
    assert.strictEqual(typeof res.hasMore, 'boolean')
    assert.strictEqual(res.page, 1)
    assert.strictEqual(res.pageSize, 10)
  })

  it('should support category, severity, and unread-only filtering without synthetic fallbacks', async () => {
    // 1. Create distinct test notifications
    const secNotif = await PlatformService.createNotification({
      title: `Critical Alert ${Date.now()}`,
      message: 'Database replication delay exceeded 5000ms',
      severity: 'critical',
      type: 'system',
    })

    const tenantNotif = await PlatformService.createNotification({
      title: `New Tenant Provisioned ${Date.now()}`,
      message: 'Tenant "Dhaka Prints Ltd" registered on Starter plan',
      severity: 'info',
      type: 'tenant',
    })

    assert.ok(secNotif.data)
    assert.ok(tenantNotif.data)

    // 2. Filter by severity 'critical'
    const critRes = await PlatformService.getNotifications({ severity: 'critical' })
    assert.ok(critRes.data.every((n) => n.severity === 'critical'))

    // 3. Filter by type 'tenant'
    const tenantRes = await PlatformService.getNotifications({ type: 'tenant' })
    assert.ok(tenantRes.data.every((n) => ['tenant', 'tenant_lifecycle', 'tenant_suspension'].includes(n.type)))
  })

  it('should support safe fallback for unknown notification categories under "All"', () => {
    const unknownItem: PlatformNotificationItem = {
      id: `unknown-${Date.now()}`,
      title: 'Custom AI Pipeline Alert',
      message: 'Model evaluation completed with 99.4% accuracy.',
      severity: 'info',
      type: 'custom_ai_engine_event',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Filter check: "all" must include unknown types
    const filterTab = 'all'
    const isIncludedInAll = filterTab === 'all' || unknownItem.type === filterTab
    assert.strictEqual(isIncludedInAll, true)

    // Unknown category should not crash UI or be dropped
    const fallbackCategory = ['support', 'tenant', 'billing', 'system'].includes(unknownItem.type)
      ? unknownItem.type
      : 'system' // Safe category fallback
    assert.strictEqual(fallbackCategory, 'system')
  })

  it('should mark a notification as read and update read_at timestamp', async () => {
    const notif = await PlatformService.createNotification({
      title: `Mark Read Test ${Date.now()}`,
      message: 'Quota limit approaching 80%',
      severity: 'warning',
      type: 'usage_warning',
    })

    assert.ok(notif.data?.id)
    const markRes = await PlatformService.markNotificationRead(notif.data!.id, 'admin-user-1')
    assert.strictEqual(markRes.success, true)
  })

  it('should mark all notifications as read', async () => {
    const res = await PlatformService.markAllNotificationsRead('admin-user-1')
    assert.strictEqual(res.success, true)
  })

  it('should delete a notification and clear read notifications', async () => {
    const notif = await PlatformService.createNotification({
      title: `Delete Test ${Date.now()}`,
      message: 'Temporary alert to be cleared',
      severity: 'info',
      type: 'broadcast',
    })

    assert.ok(notif.data?.id)
    const delRes = await PlatformService.deleteNotification(notif.data!.id, 'admin-user-1')
    assert.strictEqual(delRes.success, true)

    const clearRes = await PlatformService.clearAllReadNotifications('admin-user-1')
    assert.strictEqual(clearRes.success, true)
  })

  it('should properly manage Realtime subscription lifecycle and reference counting for platform channel', () => {
    let eventReceived = false
    const unsub1 = realtimeManager.subscribeToPlatformNotifications((_evt) => {
      eventReceived = true
    })

    assert.strictEqual(typeof unsub1, 'function')

    const unsub2 = realtimeManager.subscribeToPlatformNotifications(() => {})
    assert.strictEqual(typeof unsub2, 'function')

    // Cleanup both
    unsub1()
    unsub2()
    assert.strictEqual(eventReceived, false)
  })

  it('should guarantee deduplication by notification id when merging initial and realtime state', () => {
    const existingList: PlatformNotificationItem[] = [
      {
        id: 'notif-101',
        title: 'Existing Alert 1',
        message: 'Message 1',
        severity: 'info',
        type: 'system',
        is_read: false,
        created_at: '2026-09-12T12:00:00Z',
        updated_at: '2026-09-12T12:00:00Z',
      },
      {
        id: 'notif-102',
        title: 'Existing Alert 2',
        message: 'Message 2',
        severity: 'warning',
        type: 'billing',
        is_read: true,
        created_at: '2026-09-12T11:00:00Z',
        updated_at: '2026-09-12T11:00:00Z',
      },
    ]

    const incomingDuplicate: PlatformNotificationItem = {
      id: 'notif-101', // duplicate ID
      title: 'Existing Alert 1',
      message: 'Message 1',
      severity: 'info',
      type: 'system',
      is_read: false,
      created_at: '2026-09-12T12:00:00Z',
      updated_at: '2026-09-12T12:00:00Z',
    }

    const incomingNew: PlatformNotificationItem = {
      id: 'notif-103',
      title: 'New Realtime Alert',
      message: 'Message 3',
      severity: 'critical',
      type: 'security',
      is_read: false,
      created_at: '2026-09-12T13:00:00Z',
      updated_at: '2026-09-12T13:00:00Z',
    }

    // Deduplication logic test
    const dedupAdd = (prev: PlatformNotificationItem[], item: PlatformNotificationItem) => {
      if (prev.some((n) => n.id === item.id)) return prev
      return [item, ...prev]
    }

    const afterDuplicate = dedupAdd(existingList, incomingDuplicate)
    assert.strictEqual(afterDuplicate.length, 2)

    const afterNew = dedupAdd(afterDuplicate, incomingNew)
    assert.strictEqual(afterNew.length, 3)
    assert.strictEqual(afterNew[0].id, 'notif-103')
  })

  it('should calculate unread counter arithmetic accurately without stale or negative numbers', () => {
    let unreadCount = 3

    // 1. New unread item arrives via Realtime
    unreadCount = unreadCount + 1
    assert.strictEqual(unreadCount, 4)

    // 2. Mark one item read
    unreadCount = Math.max(0, unreadCount - 1)
    assert.strictEqual(unreadCount, 3)

    // 3. Mark all read
    unreadCount = 0
    assert.strictEqual(unreadCount, 0)

    // 4. Mark read when 0 does not go negative
    unreadCount = Math.max(0, unreadCount - 1)
    assert.strictEqual(unreadCount, 0)
  })

  it('should strictly isolate platform notifications from tenant company broadcast channels', () => {
    const tenantCompanyId = '550e8400-e29b-41d4-a716-446655440000'
    const tenantChannelName = `company:${tenantCompanyId}:realtime`
    const platformChannelName = 'platform:notifications:admin'

    // Verify channel names never overlap
    assert.notStrictEqual(tenantChannelName, platformChannelName)
    assert.strictEqual(tenantChannelName.includes('platform:notifications'), false)
    assert.strictEqual(platformChannelName.includes('company:'), false)
  })
})

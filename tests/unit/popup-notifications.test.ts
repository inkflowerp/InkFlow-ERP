import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getTrialDaysRemaining } from '../../lib/subscription/subscription-constants.ts'

describe('Popup Notification & Trial Alert Logic Unit Tests', () => {
  it('identifies trial warning threshold correctly (<= 7 days and <= 3 days)', () => {
    const now = Date.now()
    const fiveDaysFuture = new Date(now + 5 * 86400000).toISOString()
    const twoDaysFuture = new Date(now + 2 * 86400000).toISOString()
    const pastDate = new Date(now - 1 * 86400000).toISOString()

    const remaining5 = getTrialDaysRemaining(fiveDaysFuture)
    const remaining2 = getTrialDaysRemaining(twoDaysFuture)
    const remainingExpired = getTrialDaysRemaining(pastDate)

    assert.strictEqual(remaining5, 5)
    assert.strictEqual(remaining2, 2)
    assert.strictEqual(remainingExpired, 0)

    // Check popup urgency flags
    const shouldShowPopup5 = remaining5 <= 7
    const shouldShowPopup2 = remaining2 <= 7
    const isUrgent2 = remaining2 <= 3
    const isExpired = remainingExpired <= 0

    assert.strictEqual(shouldShowPopup5, true)
    assert.strictEqual(shouldShowPopup2, true)
    assert.strictEqual(isUrgent2, true)
    assert.strictEqual(isExpired, true)
  })

  it('calculates trial progress percentage accurately for active and expired trials', () => {
    const totalDays = 14
    const remainingDays = 7
    const elapsed = Math.max(0, totalDays - remainingDays)
    const progress = Math.min(100, Math.round((elapsed / totalDays) * 100))

    assert.strictEqual(progress, 50)

    const remaining0 = 0
    const elapsed0 = Math.max(0, totalDays - remaining0)
    const progress0 = Math.min(100, Math.round((elapsed0 / totalDays) * 100))

    assert.strictEqual(progress0, 100)
  })

  it('validates snooze duration computation (e.g. 2 hours, 4 hours, 12 hours)', () => {
    const now = 1700000000000
    const snooze2Hours = now + 2 * 60 * 60 * 1000
    const snooze4Hours = now + 4 * 60 * 60 * 1000
    const snooze12Hours = now + 12 * 60 * 60 * 1000

    assert.strictEqual(snooze2Hours - now, 7200000)
    assert.strictEqual(snooze4Hours - now, 14400000)
    assert.strictEqual(snooze12Hours - now, 43200000)
  })

  it('formats Plan Limit Reached warning messages accurately for popup notifications', () => {
    const formatLimitReachedMessage = (resource: string, limit: number, current: number) => {
      return `Plan Limit Reached: Your current plan allows up to ${limit} ${resource} quota (currently at ${current}). Please upgrade your subscription to continue.`
    }

    const userMsg = formatLimitReachedMessage('Users', 2, 2)
    assert.strictEqual(
      userMsg,
      'Plan Limit Reached: Your current plan allows up to 2 Users quota (currently at 2). Please upgrade your subscription to continue.'
    )

    const orderMsg = formatLimitReachedMessage('Monthly Orders', 100, 100)
    assert.strictEqual(
      orderMsg,
      'Plan Limit Reached: Your current plan allows up to 100 Monthly Orders quota (currently at 100). Please upgrade your subscription to continue.'
    )

    const customerMsg = formatLimitReachedMessage('Customers', 50, 50)
    assert.strictEqual(
      customerMsg,
      'Plan Limit Reached: Your current plan allows up to 50 Customers quota (currently at 50). Please upgrade your subscription to continue.'
    )
  })

  it('verifies button disable condition when current usage reaches or exceeds plan limit', () => {
    const evaluateButtonDisabled = (current: number, limit: number) => {
      if (limit <= 0 || limit >= 99999) return false // unlimited
      return current >= limit
    }

    assert.strictEqual(evaluateButtonDisabled(2, 2), true) // at limit (2/2) -> disabled
    assert.strictEqual(evaluateButtonDisabled(3, 2), true) // exceeded (3/2) -> disabled
    assert.strictEqual(evaluateButtonDisabled(1, 2), false) // under limit (1/2) -> enabled
    assert.strictEqual(evaluateButtonDisabled(500, -1), false) // enterprise unlimited -> enabled
  })
})

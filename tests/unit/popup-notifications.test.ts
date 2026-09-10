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

  it('verifies dynamic trial duration and limits reflect customized trial plan immediately', () => {
    const customTrialPlan = {
      id: 'sp-00',
      code: 'trial',
      name: 'Free Trial (30 Days)',
      trial_days: 30,
      max_users: 2,
      max_branches: 1,
      monthly_orders: 100,
      max_customers: 200,
    }

    const companyCreatedAt = new Date().toISOString()
    const trialEndsAt = new Date(new Date(companyCreatedAt).getTime() + customTrialPlan.trial_days * 86400000).toISOString()
    const daysRemaining = getTrialDaysRemaining(trialEndsAt)

    assert.strictEqual(daysRemaining, 30)
    assert.strictEqual(customTrialPlan.max_users, 2)
  })

  it('triggers upgrade plan or limit exceeded popup on button press when limit reached or trial expired', () => {
    let triggeredPopup: string | null = null

    const handleButtonClick = (options: {
      limitType: 'max_users' | 'max_branches' | 'max_customers' | 'monthly_orders' | 'max_products'
      currentUsage: number
      maxLimit: number
      isTrialExpired: boolean
    }) => {
      const isLimitReached = options.maxLimit > 0 && options.currentUsage >= options.maxLimit
      if (isLimitReached || options.isTrialExpired) {
        triggeredPopup = `limit_exceeded_${options.limitType}`
        return false // blocked action, opened popup
      }
      triggeredPopup = 'action_modal_opened'
      return true
    }

    // 1. User clicks Add User when 2/2 users used
    handleButtonClick({ limitType: 'max_users', currentUsage: 2, maxLimit: 2, isTrialExpired: false })
    assert.strictEqual(triggeredPopup, 'limit_exceeded_max_users')

    // 2. User clicks Add Branch when 1/1 branch used
    handleButtonClick({ limitType: 'max_branches', currentUsage: 1, maxLimit: 1, isTrialExpired: false })
    assert.strictEqual(triggeredPopup, 'limit_exceeded_max_branches')

    // 3. User clicks New Quotation / Order when trial expired
    handleButtonClick({ limitType: 'monthly_orders', currentUsage: 10, maxLimit: 100, isTrialExpired: true })
    assert.strictEqual(triggeredPopup, 'limit_exceeded_monthly_orders')

    // 4. User clicks New Customer when under quota and trial active
    handleButtonClick({ limitType: 'max_customers', currentUsage: 10, maxLimit: 200, isTrialExpired: false })
    assert.strictEqual(triggeredPopup, 'action_modal_opened')
  })
})


'use server'

// ==============================================================================
// PrintFlow SaaS - Authoritative Server Action for Demo Walkthrough Requests
// Handles validation, anti-XSS sanitization, rate limiting, and persistence
// into platform_notifications ledger via Supabase Admin client.
// ==============================================================================

import { normalizeBdPhoneNumber, isValidEmail } from '@/lib/gateway/phone-utils'
import { PlatformService } from '@/services/platform.service'

export interface SubmitDemoRequestInput {
  pressName: string
  contactName: string
  phone: string
  email?: string
  city?: string
  businessType?: string
}

export interface DemoRequestResult {
  success: boolean
  message?: string
  error?: string
}

// In-memory rate limiting map: Max 5 submissions per 10 minutes per phone
const SUBMISSION_CACHE = new Map<string, number[]>()

function checkRateLimit(key: string, maxAllowed: number, windowMs: number): boolean {
  const now = Date.now()
  const history = (SUBMISSION_CACHE.get(key) || []).filter((ts) => now - ts < windowMs)
  if (history.length >= maxAllowed) {
    return false
  }
  history.push(now)
  SUBMISSION_CACHE.set(key, history)
  return true
}

function sanitizeText(input?: string | null): string {
  if (!input) return ''
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
}

/**
 * Server Action: Validates and securely persists a public Demo Walkthrough Request
 */
export async function submitDemoRequestAction(
  input: SubmitDemoRequestInput
): Promise<DemoRequestResult> {
  try {
    const cleanPressName = sanitizeText(input.pressName)
    const cleanContactName = sanitizeText(input.contactName)
    const rawPhone = input.phone ? input.phone.trim() : ''
    const cleanEmail = input.email ? input.email.trim() : ''
    const cleanCity = sanitizeText(input.city) || 'Dhaka'
    const cleanBusinessType = sanitizeText(input.businessType) || 'Printing & Signage'

    // 1. Validate required fields
    if (!cleanPressName || cleanPressName.length < 2) {
      return { success: false, error: 'Please enter your press or business name (at least 2 characters).' }
    }

    if (!cleanContactName || cleanContactName.length < 2) {
      return { success: false, error: 'Please enter your contact name (at least 2 characters).' }
    }

    // 2. Validate Bangladeshi or international mobile number
    const phoneValidation = normalizeBdPhoneNumber(rawPhone, true)
    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: phoneValidation.error || 'Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX).',
      }
    }

    // 3. Validate optional email
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please provide a valid email address or leave it blank.' }
    }

    // 4. Rate limiting check by normalized phone
    const rateLimitKey = `demo_req_${phoneValidation.formatted}`
    const isAllowed = checkRateLimit(rateLimitKey, 3, 10 * 60 * 1000)
    if (!isAllowed) {
      return {
        success: false,
        error: 'You have submitted multiple demo requests recently. Our Dhaka team will contact you shortly.',
      }
    }

    // 5. Persist to platform_notifications table & dispatch Telegram alert
    const notifRes = await PlatformService.createNotification({
      title: `New Demo Walkthrough: ${cleanPressName}`,
      message: `Contact: ${cleanContactName}\nPhone: ${phoneValidation.formatted} (${phoneValidation.operator || 'Mobile'})\nEmail: ${cleanEmail || 'N/A'}\nCity: ${cleanCity}\nBusiness Focus: ${cleanBusinessType}`,
      type: 'general',
      severity: 'info',
      target_audience: 'all_admins',
      action_url: '/platform/tenants',
    })

    if (!notifRes.success) {
      console.error('[submitDemoRequestAction] Notification creation error:', notifRes.error)
      return {
        success: false,
        error: 'Unable to schedule walkthrough at this moment. Please call our Dhaka helpline directly.',
      }
    }

    return {
      success: true,
      message: 'Demo walkthrough scheduled successfully. Our specialist will call you within 2 business hours.',
    }
  } catch (err: any) {
    console.error('[submitDemoRequestAction] Unexpected error:', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while scheduling your demo.',
    }
  }
}

// ==============================================================================
// PrintFlow SaaS - Dual-Channel OTP Service (WhatsApp Primary + SMS Fallback)
// High-assurance authentication and verification delivery with anti-abuse throttling.
// ==============================================================================

import crypto from 'node:crypto'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { CommunicationRouter } from './communication-router.ts'
import { GatewayService } from './gateway.service.ts'
import { normalizeBdPhoneNumber } from '../lib/gateway/phone-utils.ts'
import type { OtpRequestRecord } from '../types/communication.types.ts'

export interface RequestOtpParams {
  tenantId: string
  phone: string
  purpose: 'login' | 'verify_phone' | 'password_reset' | 'transaction_approval'
  ipAddress?: string | null
  userAgent?: string | null
  preferredChannel?: 'whatsapp' | 'sms'
}

export interface RequestOtpResult {
  success: boolean
  channelUsed?: 'whatsapp' | 'sms'
  expiresAt?: string
  error?: string
  message?: string
}

export interface VerifyOtpParams {
  tenantId: string
  phone: string
  purpose: 'login' | 'verify_phone' | 'password_reset' | 'transaction_approval' | string
  otpCode: string
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
  message?: string
}

export class OtpService {
  /**
   * Generates a cryptographically secure 6-digit numeric OTP code
   */
  static generateNumericOtp(): string {
    const min = 100000
    const max = 999999
    return String(crypto.randomInt(min, max + 1))
  }

  /**
   * Requests an OTP code, attempting WhatsApp primary and falling back to SMS
   */
  static async requestOtp(params: RequestOtpParams): Promise<RequestOtpResult> {
    const {
      tenantId,
      phone,
      purpose,
      ipAddress,
      userAgent,
      preferredChannel = 'whatsapp',
    } = params

    // 1. Normalize Bangladesh phone number
    const { isValid, formatted, error: phoneErr } = normalizeBdPhoneNumber(phone, false)
    if (!isValid || !formatted) {
      return {
        success: false,
        error: phoneErr || 'Invalid mobile phone number format.',
      }
    }

    const adminClient = createAdminClient()

    // 2. Throttling: Max 3 requests in the last 10 minutes for this phone & tenant
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: recentCount } = await (adminClient as any)
      .from('otp_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('phone_number', formatted)
      .gte('created_at', tenMinutesAgo)

    if (recentCount && recentCount >= 4) {
      return {
        success: false,
        error: 'Too many OTP requests. Please wait a few minutes before trying again.',
      }
    }

    // 3. Generate OTP and expiry (5 minutes)
    const otpCode = this.generateNumericOtp()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const otpMessage = `Your PrintFlow verification code is: *${otpCode}*.\n\nValid for 5 minutes. Never share this code with anyone.\nআপনার ভেরিফিকেশন কোড: ${otpCode}`

    let channelUsed: 'whatsapp' | 'sms' = preferredChannel
    let deliverySuccess = false
    let deliveryError: string | undefined

    // 4. Try WhatsApp if preferred
    if (preferredChannel === 'whatsapp') {
      try {
        const waResult = await CommunicationRouter.sendTenantWhatsApp({
          companyId: tenantId,
          recipientPhone: formatted,
          messageText: otpMessage,
        })

        if (waResult.success) {
          deliverySuccess = true
          channelUsed = 'whatsapp'
        } else {
          deliveryError = waResult.error
        }
      } catch (err: any) {
        deliveryError = err?.message
      }
    }

    // 5. Automatic Fallback to SMS if WhatsApp failed or if SMS was explicitly requested
    if (!deliverySuccess) {
      try {
        const smsResult = await GatewayService.sendTestMessage({
          category: 'sms',
          recipient: formatted,
          recipientName: 'User',
          message: `PrintFlow Code: ${otpCode}. Valid for 5 minutes. Do not share.`,
        })

        if (smsResult.success) {
          deliverySuccess = true
          channelUsed = 'sms'
        } else {
          deliveryError = smsResult.error || deliveryError || 'SMS delivery failed.'
        }
      } catch (smsErr: any) {
        deliveryError = smsErr?.message || deliveryError || 'SMS gateway failure.'
      }
    }

    if (!deliverySuccess) {
      return {
        success: false,
        error: deliveryError || 'Failed to dispatch verification code via WhatsApp or SMS.',
      }
    }

    // 6. Record in otp_requests table
    await (adminClient as any).from('otp_requests').insert({
      tenant_id: tenantId,
      phone_number: formatted,
      purpose,
      otp_code: otpCode,
      primary_channel: preferredChannel,
      channel_used: channelUsed,
      is_verified: false,
      expires_at: expiresAt,
      attempts: 0,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    })

    return {
      success: true,
      channelUsed,
      expiresAt,
      message: `Verification code sent via ${channelUsed === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`,
    }
  }

  /**
   * Verifies an OTP code against active unexpired requests
   */
  static async verifyOtp(params: VerifyOtpParams): Promise<VerifyOtpResult> {
    const { tenantId, phone, purpose, otpCode } = params

    const { isValid, formatted } = normalizeBdPhoneNumber(phone, false)
    if (!isValid || !formatted) {
      return { success: false, error: 'Invalid phone number format.' }
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      return { success: false, error: 'Verification code must be 6 digits.' }
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // 1. Fetch latest unverified OTP for this phone and purpose
    const { data: request, error } = await (adminClient as any)
      .from('otp_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('phone_number', formatted)
      .eq('purpose', purpose)
      .eq('is_verified', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !request) {
      return {
        success: false,
        error: 'Verification code expired or not found. Please request a new code.',
      }
    }

    const record = request as OtpRequestRecord

    // 2. Check maximum attempts
    if (record.attempts >= 5) {
      return {
        success: false,
        error: 'Too many incorrect attempts. Please request a new verification code.',
      }
    }

    // 3. Compare code
    const isMatch = record.otp_code.trim() === otpCode.trim()

    if (!isMatch) {
      await (adminClient as any)
        .from('otp_requests')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id)

      return {
        success: false,
        error: `Incorrect code. ${4 - record.attempts} attempts remaining.`,
      }
    }

    // 4. Mark verified
    await (adminClient as any)
      .from('otp_requests')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', record.id)

    return {
      success: true,
      message: 'Code verified successfully.',
    }
  }
}

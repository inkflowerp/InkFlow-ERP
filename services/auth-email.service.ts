// ==============================================================================
// PrintERP SaaS - Authentication & Security Email Service
// Handles cryptographically secure OTP generation, single-use token tracking,
// attempt throttling, resend cooldowns, password resets, and user invitation emails.
// ==============================================================================

import crypto from 'crypto'
import { EmailGatewayService } from './email-gateway.service.ts'
import type { SendEmailResult, EmailScopeType } from '../types/communication.types.ts'

export interface OtpRecord {
  code: string
  purpose: 'verification' | 'password_reset' | 'login_2fa' | 'security_alert'
  email: string
  expiresAt: number
  attemptsLeft: number
  resendAvailableAt: number
  isUsed: boolean
  createdAt: number
}

export class AuthEmailService {
  private static otpStore: Map<string, OtpRecord> = new Map()

  /**
   * Generates a cryptographically secure 6-digit numeric OTP
   */
  static generateSecureOtp(): string {
    return crypto.randomInt(100000, 999999).toString()
  }

  /**
   * Creates or refreshes an active OTP record with strict rate limiting & cooldown
   */
  static createOtpRecord(
    email: string,
    purpose: OtpRecord['purpose'] = 'verification',
    ttlSeconds: number = 300 // 5 minutes default
  ): { otp: string; record: OtpRecord } | { error: string } {
    const normalizedEmail = email.trim().toLowerCase()
    const storeKey = `${normalizedEmail}:${purpose}`
    const existing = this.otpStore.get(storeKey)
    const now = Date.now()

    // 1. Enforce 60s Resend Cooldown
    if (existing && !existing.isUsed && now < existing.resendAvailableAt) {
      const waitSec = Math.ceil((existing.resendAvailableAt - now) / 1000)
      return { error: `Please wait ${waitSec}s before requesting a new verification code.` }
    }

    const otp = this.generateSecureOtp()
    const record: OtpRecord = {
      code: otp,
      purpose,
      email: normalizedEmail,
      expiresAt: now + ttlSeconds * 1000,
      attemptsLeft: 3,
      resendAvailableAt: now + 60 * 1000, // 60s cooldown
      isUsed: false,
      createdAt: now,
    }

    this.otpStore.set(storeKey, record)
    return { otp, record }
  }

  /**
   * Verifies an OTP with single-use guarantee and brute-force attempt limits
   */
  static verifyOtp(
    email: string,
    providedOtp: string,
    purpose: OtpRecord['purpose'] = 'verification'
  ): { success: boolean; error?: string } {
    const normalizedEmail = email.trim().toLowerCase()
    const storeKey = `${normalizedEmail}:${purpose}`
    const record = this.otpStore.get(storeKey)
    const now = Date.now()

    if (!record) {
      return { success: false, error: 'No active verification code found. Please request a new code.' }
    }

    if (record.isUsed) {
      return { success: false, error: 'This verification code has already been used.' }
    }

    if (now > record.expiresAt) {
      this.otpStore.delete(storeKey)
      return { success: false, error: 'Verification code has expired. Please request a new code.' }
    }

    if (record.attemptsLeft <= 0) {
      this.otpStore.delete(storeKey)
      return { success: false, error: 'Too many incorrect attempts. Code has been invalidated.' }
    }

    // Compare with timing-safe comparison to prevent timing attacks
    const isMatch =
      providedOtp.length === record.code.length &&
      crypto.timingSafeEqual(Buffer.from(providedOtp), Buffer.from(record.code))

    if (!isMatch) {
      record.attemptsLeft -= 1
      if (record.attemptsLeft <= 0) {
        this.otpStore.delete(storeKey)
        return { success: false, error: 'Incorrect code. Maximum attempts exceeded.' }
      }
      return {
        success: false,
        error: `Incorrect verification code. ${record.attemptsLeft} attempt(s) remaining.`,
      }
    }

    // Mark single-use consumed
    record.isUsed = true
    this.otpStore.delete(storeKey)
    return { success: true }
  }

  /**
   * Dispatches OTP verification email through the appropriate scope provider
   */
  static async sendOtpEmail(params: {
    email: string
    userName?: string
    purpose?: OtpRecord['purpose']
    scopeType?: EmailScopeType
    tenantId?: string | null
  }): Promise<SendEmailResult & { otpCreated?: boolean }> {
    const { email, userName, purpose = 'verification', scopeType = 'PLATFORM', tenantId } = params

    const otpRes = this.createOtpRecord(email, purpose)
    if ('error' in otpRes) {
      return {
        success: false,
        status: 'failed',
        error: otpRes.error,
        otpCreated: false,
      }
    }

    const { otp } = otpRes

    const result = await EmailGatewayService.sendEmail({
      scopeType,
      tenantId,
      eventType: 'security_alert',
      recipient: email,
      variables: {
        user_name: userName || email.split('@')[0],
        otp_code: otp,
        expires_minutes: '5',
        action_type: purpose === 'password_reset' ? 'Password Reset' : 'Account Verification',
        timestamp: new Date().toLocaleString(),
      },
      customSubject: `Your Security Verification Code: ${otp}`,
      idempotencyKey: `otp:${email}:${purpose}:${Date.now()}`,
    })

    return {
      ...result,
      otpCreated: true,
    }
  }

  /**
   * Dispatches Password Reset Email with secure action link
   */
  static async sendPasswordResetEmail(params: {
    email: string
    resetUrl: string
    userName?: string
    scopeType?: EmailScopeType
    tenantId?: string | null
  }): Promise<SendEmailResult> {
    const { email, resetUrl, userName, scopeType = 'PLATFORM', tenantId } = params

    return await EmailGatewayService.sendEmail({
      scopeType,
      tenantId,
      eventType: 'password_reset',
      recipient: email,
      variables: {
        user_name: userName || email.split('@')[0],
        reset_link: resetUrl,
        expires_hours: '2',
        timestamp: new Date().toLocaleString(),
      },
      customSubject: 'Reset Your InkFlow Account Password',
      idempotencyKey: `pwd_reset:${email}:${Date.now()}`,
    })
  }

  /**
   * Dispatches Tenant Employee / User Invitation Email
   */
  static async sendUserInvitationEmail(params: {
    email: string
    inviteUrl: string
    companyName: string
    roleName: string
    invitedByName?: string
    tenantId: string
  }): Promise<SendEmailResult> {
    const { email, inviteUrl, companyName, roleName, invitedByName, tenantId } = params

    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId,
      eventType: 'user_invitation',
      recipient: email,
      variables: {
        company_name: companyName,
        role_name: roleName,
        invited_by: invitedByName || 'Your Administrator',
        invite_link: inviteUrl,
        timestamp: new Date().toLocaleString(),
      },
      customSubject: `Invitation to join ${companyName} on InkFlow`,
      idempotencyKey: `invite:${tenantId}:${email}`,
    })
  }
}

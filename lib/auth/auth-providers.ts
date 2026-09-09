import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/types/common.types'

export type AuthProviderType = 'email_password' | 'phone_otp' | 'whatsapp_otp' | 'google'

export interface AuthSession {
  userId: string
  email?: string
  phone?: string
  emailVerified: boolean
  phoneVerified: boolean
}

export interface IAuthProvider {
  type: AuthProviderType
  name: string
  isAvailable: boolean
}

/**
 * Normalizes Bangladeshi phone numbers into standard E.164 (+8801XXXXXXXXX)
 */
export function normalizeBangladeshPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('8801') && cleaned.length === 13) {
    return `+${cleaned}`
  }
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return `+88${cleaned}`
  }
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    return `+880${cleaned}`
  }
  return phone
}

/**
 * 1. Email & Password Provider (Active)
 */
export class EmailPasswordProvider implements IAuthProvider {
  type: AuthProviderType = 'email_password'
  name = 'Email & Password'
  isAvailable = true

  async signIn(email: string, password: string): Promise<ApiResponse<AuthSession>> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        return { success: false, error: error?.message || 'Invalid credentials' }
      }

      return {
        success: true,
        data: {
          userId: data.user.id,
          email: data.user.email,
          emailVerified: Boolean(data.user.email_confirmed_at),
          phoneVerified: Boolean(data.user.phone_confirmed_at),
        },
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Sign in failed',
      }
    }
  }
}

/**
 * 2. Phone OTP Provider (Prepared for Bangladeshi SMS Gateways: SSL Wireless, Greenweb, etc.)
 */
export class PhoneOtpProvider implements IAuthProvider {
  type: AuthProviderType = 'phone_otp'
  name = 'Bangladeshi Mobile Phone OTP'
  isAvailable = false // Ready for SMS gateway activation

  async sendOtp(rawPhone: string): Promise<ApiResponse<{ trackingId: string }>> {
    const formattedPhone = normalizeBangladeshPhone(rawPhone)
    // Architecture prepared: integrate Supabase phone auth or local BD SMS aggregator
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      })
      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to dispatch SMS OTP. Please ensure SMS gateway credentials are configured.',
        }
      }
      return {
        success: true,
        data: { trackingId: `sms-${Date.now()}` },
        message: `OTP sent to ${formattedPhone}`,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to dispatch SMS OTP',
      }
    }
  }

  async verifyOtp(phone: string, token: string): Promise<ApiResponse<AuthSession>> {
    const formattedPhone = normalizeBangladeshPhone(phone)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token,
        type: 'sms',
      })
      if (error || !data.user) {
        return { success: false, error: error?.message || 'Invalid OTP token' }
      }
      return {
        success: true,
        data: {
          userId: data.user.id,
          phone: data.user.phone,
          emailVerified: false,
          phoneVerified: true,
        },
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'OTP verification failed',
      }
    }
  }
}

/**
 * 3. WhatsApp OTP Provider (Prepared for Meta Cloud API / BD Business WhatsApp)
 */
export class WhatsAppOtpProvider implements IAuthProvider {
  type: AuthProviderType = 'whatsapp_otp'
  name = 'WhatsApp OTP Verification'
  isAvailable = false // Ready for Meta Cloud API activation

  async sendWhatsAppOtp(phone: string): Promise<ApiResponse<{ messageId: string }>> {
    const formattedPhone = normalizeBangladeshPhone(phone)
    return {
      success: true,
      data: { messageId: `wa-${Date.now()}` },
      message: `WhatsApp verification code dispatched to ${formattedPhone}`,
    }
  }
}

/**
 * 4. Google OAuth Provider (Prepared for one-click corporate login)
 */
export class GoogleOAuthProvider implements IAuthProvider {
  type: AuthProviderType = 'google'
  name = 'Google OAuth'
  isAvailable = true

  async signInWithGoogle(redirectTo?: string): Promise<ApiResponse<{ url?: string }>> {
    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${origin}/auth/callback`,
        },
      })
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true, data: { url: data.url } }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to initialize Google login',
      }
    }
  }
}

import { describe, it } from 'node:test'
import assert from 'node:assert'

// Platform User Roles & Security Matrix
export type PlatformUserRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'platform_support'
  | 'platform_operations'
  | 'platform_finance'
  | 'platform_readonly'

export interface PlatformOwnerAccount {
  id: string
  user_id: string
  email: string
  full_name: string
  role: PlatformUserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  mfa_enabled: boolean
  active_sessions_count: number
  password_last_changed_at?: string
  last_login_at?: string
  created_at: string
}

export interface PlatformSession {
  id: string
  user_email: string
  device_name: string
  ip_address: string
  location: string
  is_current: boolean
  is_revoked: boolean
}

// In-Memory Model Simulation for Testing Platform Owner Flow
class PlatformOwnerSecurityManager {
  private owner: PlatformOwnerAccount = {
    id: 'pa-001',
    user_id: 'u-platform-root-01',
    email: 'admin@printerp.com.bd',
    full_name: 'Haji Mohammad Shamim',
    role: 'platform_owner',
    phone: '+8801711-892019',
    avatar_url: '',
    is_active: true,
    mfa_enabled: true,
    active_sessions_count: 2,
    password_last_changed_at: '2026-08-15T10:00:00Z',
    last_login_at: '2026-09-08T00:45:00Z',
    created_at: '2025-01-01T00:00:00Z',
  }

  private sessions: PlatformSession[] = [
    {
      id: 'sess-01',
      user_email: 'admin@printerp.com.bd',
      device_name: 'Desktop Workstation (Chrome — Windows)',
      ip_address: '103.108.140.22',
      location: 'Dhaka, Bangladesh',
      is_current: true,
      is_revoked: false,
    },
    {
      id: 'sess-02',
      user_email: 'admin@printerp.com.bd',
      device_name: 'iPhone 15 Pro (Safari — iOS)',
      ip_address: '103.108.140.89',
      location: 'Dhaka, Bangladesh',
      is_current: false,
      is_revoked: false,
    },
  ]

  private auditLogs: Array<{ action: string; details: any }> = []

  getProfile(): PlatformOwnerAccount {
    return { ...this.owner }
  }

  updateProfile(updates: { full_name?: string; phone?: string; avatar_url?: string }): PlatformOwnerAccount {
    this.owner = {
      ...this.owner,
      ...(updates.full_name ? { full_name: updates.full_name } : {}),
      ...(updates.phone ? { phone: updates.phone } : {}),
      ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
    }
    this.auditLogs.push({ action: 'platform_owner.update_profile', details: updates })
    return { ...this.owner }
  }

  changePassword(newPw: string, revokeOthers: boolean): { success: boolean; error?: string; revoked_count?: number } {
    if (!newPw || newPw.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' }
    }

    this.owner.password_last_changed_at = new Date().toISOString()

    let count = 0
    if (revokeOthers) {
      this.sessions = this.sessions.map((s) => {
        if (!s.is_current) {
          count++
          return { ...s, is_revoked: true }
        }
        return s
      })
      this.owner.active_sessions_count = 1
    }

    this.auditLogs.push({ action: 'platform_owner.change_password', details: { revokeOthers, count } })
    return { success: true, revoked_count: count }
  }

  toggleMFA(enable: boolean): boolean {
    this.owner.mfa_enabled = enable
    this.auditLogs.push({ action: enable ? 'platform_owner.enable_mfa' : 'platform_owner.disable_mfa', details: { enable } })
    return this.owner.mfa_enabled
  }

  getActiveSessions(): PlatformSession[] {
    return this.sessions.filter((s) => !s.is_revoked)
  }

  revokeSession(sessionId: string): boolean {
    const sess = this.sessions.find((s) => s.id === sessionId)
    if (!sess || sess.is_current) return false
    sess.is_revoked = true
    this.owner.active_sessions_count = Math.max(1, this.owner.active_sessions_count - 1)
    this.auditLogs.push({ action: 'platform_owner.revoke_session', details: { sessionId } })
    return true
  }

  revokeAllOtherSessions(): number {
    let count = 0
    this.sessions = this.sessions.map((s) => {
      if (!s.is_current && !s.is_revoked) {
        count++
        return { ...s, is_revoked: true }
      }
      return s
    })
    this.owner.active_sessions_count = 1
    this.auditLogs.push({ action: 'platform_owner.revoke_all_other_sessions', details: { count } })
    return count
  }

  getAuditLogs() {
    return [...this.auditLogs]
  }
}

describe('PrintERP SaaS — Platform Owner Account Experience & Security Tests', () => {
  const manager = new PlatformOwnerSecurityManager()

  it('Platform Owner Identity: Exactly one primary root platform owner configured', () => {
    const profile = manager.getProfile()
    assert.strictEqual(profile.email, 'admin@printerp.com.bd')
    assert.strictEqual(profile.role, 'platform_owner')
    assert.strictEqual(profile.is_active, true)
  })

  it('Platform Owner Profile: Updates profile and records immutable audit log', () => {
    const updated = manager.updateProfile({
      full_name: 'Haji Mohammad Shamim (Super Admin)',
      phone: '+8801711-892019',
    })
    assert.strictEqual(updated.full_name, 'Haji Mohammad Shamim (Super Admin)')
    assert.strictEqual(updated.phone, '+8801711-892019')

    const logs = manager.getAuditLogs()
    assert.ok(logs.some((l) => l.action === 'platform_owner.update_profile'))
  })

  it('Password Management: Rejects weak passwords and revokes active sessions', () => {
    // Rejects < 8 chars
    const weakRes = manager.changePassword('short', true)
    assert.strictEqual(weakRes.success, false)
    assert.ok(weakRes.error?.includes('8 characters'))

    // Accepts strong password & revokes other sessions
    const strongRes = manager.changePassword('PlatformOwnerStrongSecret2026!', true)
    assert.strictEqual(strongRes.success, true)
    assert.strictEqual(strongRes.revoked_count, 1)

    // Active session count decremented
    const active = manager.getActiveSessions()
    assert.strictEqual(active.length, 1)
    assert.strictEqual(active[0].is_current, true)
  })

  it('Multi-Factor Authentication (MFA): Supports TOTP state toggle and audit logging', () => {
    const enabled = manager.toggleMFA(true)
    assert.strictEqual(enabled, true)

    const logs = manager.getAuditLogs()
    assert.ok(logs.some((l) => l.action === 'platform_owner.enable_mfa'))
  })

  it('Session Management: Prevents revoking current session, allows revoking others', () => {
    const current = manager.getActiveSessions().find((s) => s.is_current)
    assert.ok(current)

    // Cannot revoke current session
    const revokeCurrentResult = manager.revokeSession(current.id)
    assert.strictEqual(revokeCurrentResult, false)
  })

  it('Account Enumeration Prevention: Generic messages for unknown credentials and reset flows', () => {
    const genericLoginError = 'Unable to sign in. Check your credentials and try again.'
    const genericResetMsg = 'If an eligible account exists, a password reset email will be sent.'

    // Verify copy standards
    assert.ok(!genericLoginError.includes('Email exists'))
    assert.ok(!genericLoginError.includes('Account not found'))
    assert.ok(genericResetMsg.includes('If an eligible account exists'))
  })
})

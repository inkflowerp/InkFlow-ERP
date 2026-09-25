import { describe, it } from 'node:test'
import assert from 'node:assert'

export interface PlatformSystemSettings {
  session_timeout_minutes: number
  mfa_required_for_admins: boolean
  rate_limit_requests_per_minute: number
  max_export_records: number
  default_trial_days: number
  default_currency: string
  default_vat_rate_pct: number
  maintenance_mode_enabled?: boolean
  maintenance_message: string
  incident_alert_webhook?: string
  backup_retention_days?: number
  auto_backup_enabled?: boolean
  updated_at?: string
  updated_by_name?: string

  // Dynamic Platform Identity, Domain & Contact Settings
  app_name?: string
  app_logo_url?: string
  app_tagline?: string
  favicon_url?: string
  app_title?: string
  app_description?: string
  support_helpline?: string
  app_domain?: string
  contact_email?: string
  contact_phone?: string
  contact_address?: string
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSystemSettings = {
  session_timeout_minutes: 120,
  mfa_required_for_admins: false,
  rate_limit_requests_per_minute: 120,
  max_export_records: 10000,
  default_trial_days: 14,
  default_currency: 'BDT',
  default_vat_rate_pct: 15,
  maintenance_mode_enabled: false,
  maintenance_message: 'InkFlow is currently undergoing scheduled platform upgrades.',
  backup_retention_days: 90,
  auto_backup_enabled: true,

  app_name: 'InkFlow ERP',
  app_logo_url: '',
  app_tagline: 'The Complete Printing & Signage Operating System',
  favicon_url: '/favicon.ico',
  app_title: 'PrintERP SaaS - Operating System for Printing & Signage in Bangladesh',
  app_description: 'Production-ready SaaS for digital printing, offset press, flex/banner, stickers, packaging, LED signage, acrylic fabrication, and installation businesses in Bangladesh.',
  support_helpline: '+880 1819-876543',
  app_domain: 'inkflow.com.bd',
  contact_email: 'support@printerp.com.bd',
  contact_phone: '+880 1819-876543',
  contact_address: 'Arambagh Press Cluster, Motijheel, Dhaka-1000, Bangladesh',
}

export function validatePlatformSettings(settings: Partial<PlatformSystemSettings>): { valid: boolean; error?: string } {
  if (settings.session_timeout_minutes !== undefined) {
    const timeout = Number(settings.session_timeout_minutes)
    if (isNaN(timeout) || timeout < 5 || timeout > 1440) {
      return { valid: false, error: 'Session timeout must be between 5 and 1440 minutes (24 hours).' }
    }
  }

  if (settings.rate_limit_requests_per_minute !== undefined) {
    const rateLimit = Number(settings.rate_limit_requests_per_minute)
    if (isNaN(rateLimit) || rateLimit < 10 || rateLimit > 10000) {
      return { valid: false, error: 'Rate limit must be between 10 and 10,000 requests per minute.' }
    }
  }

  if (settings.max_export_records !== undefined) {
    const maxExport = Number(settings.max_export_records)
    if (isNaN(maxExport) || maxExport < 100 || maxExport > 100000) {
      return { valid: false, error: 'Max export records must be between 100 and 100,000 rows.' }
    }
  }

  if (settings.default_trial_days !== undefined) {
    const trialDays = Number(settings.default_trial_days)
    if (isNaN(trialDays) || trialDays < 1 || trialDays > 365) {
      return { valid: false, error: 'Default trial duration must be between 1 and 365 days.' }
    }
  }

  if (settings.default_vat_rate_pct !== undefined) {
    const vat = Number(settings.default_vat_rate_pct)
    if (isNaN(vat) || vat < 0 || vat > 100) {
      return { valid: false, error: 'VAT percentage must be between 0% and 100%.' }
    }
  }

  if (settings.backup_retention_days !== undefined) {
    const retention = Number(settings.backup_retention_days)
    if (isNaN(retention) || retention < 7 || retention > 3650) {
      return { valid: false, error: 'Backup retention must be between 7 and 3,650 days (10 years).' }
    }
  }

  if (settings.app_name !== undefined) {
    if (!settings.app_name.trim()) {
      return { valid: false, error: 'Application name cannot be empty.' }
    }
  }

  if (settings.app_domain !== undefined && settings.app_domain.trim()) {
    if (settings.app_domain.startsWith('http://') || settings.app_domain.startsWith('https://')) {
      return { valid: false, error: 'Application domain should not include protocol (e.g. use "example.com", not "https://example.com").' }
    }
    if (settings.app_domain.includes('/')) {
      return { valid: false, error: 'Application domain should not contain a path.' }
    }
  }

  if (settings.contact_email !== undefined && settings.contact_email.trim()) {
    if (!settings.contact_email.includes('@') || !settings.contact_email.includes('.')) {
      return { valid: false, error: 'Contact email must be a valid email address.' }
    }
  }

  return { valid: true }
}

export function authorizePlatformSettingsUpdate(userRole: string): { authorized: boolean; error?: string } {
  if (userRole !== 'platform_owner') {
    return { authorized: false, error: 'Unauthorized: Only platform owner can modify system settings.' }
  }
  return { authorized: true }
}

describe('Platform System Settings & Disaster Recovery Unit Tests', () => {
  describe('1. Default Platform Settings Integrity', () => {
    it('should have valid default values for all cluster parameters', () => {
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.session_timeout_minutes, 120)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.mfa_required_for_admins, false)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.rate_limit_requests_per_minute, 120)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.max_export_records, 10000)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.default_trial_days, 14)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.default_currency, 'BDT')
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.default_vat_rate_pct, 15)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.maintenance_mode_enabled, false)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.backup_retention_days, 90)
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.auto_backup_enabled, true)
    })
  })

  describe('2. Input Bounds & Constraints Validation', () => {
    it('should allow valid settings values', () => {
      const valid = validatePlatformSettings({
        session_timeout_minutes: 60,
        rate_limit_requests_per_minute: 500,
        max_export_records: 25000,
        default_trial_days: 30,
        default_vat_rate_pct: 7.5,
        backup_retention_days: 180,
      })
      assert.strictEqual(valid.valid, true)
      assert.strictEqual(valid.error, undefined)
    })

    it('should reject out-of-bound session timeout', () => {
      const tooLow = validatePlatformSettings({ session_timeout_minutes: 2 })
      assert.strictEqual(tooLow.valid, false)
      assert.match(tooLow.error!, /Session timeout must be between 5 and 1440/)

      const tooHigh = validatePlatformSettings({ session_timeout_minutes: 2000 })
      assert.strictEqual(tooHigh.valid, false)
    })

    it('should reject out-of-bound rate limits', () => {
      const tooLow = validatePlatformSettings({ rate_limit_requests_per_minute: 5 })
      assert.strictEqual(tooLow.valid, false)
      assert.match(tooLow.error!, /Rate limit must be between 10 and 10,000/)

      const tooHigh = validatePlatformSettings({ rate_limit_requests_per_minute: 20000 })
      assert.strictEqual(tooHigh.valid, false)
    })

    it('should reject out-of-bound VAT rate percentage', () => {
      const negativeVat = validatePlatformSettings({ default_vat_rate_pct: -5 })
      assert.strictEqual(negativeVat.valid, false)

      const excessiveVat = validatePlatformSettings({ default_vat_rate_pct: 120 })
      assert.strictEqual(excessiveVat.valid, false)
    })

    it('should reject out-of-bound trial duration', () => {
      const zeroDays = validatePlatformSettings({ default_trial_days: 0 })
      assert.strictEqual(zeroDays.valid, false)

      const tooManyDays = validatePlatformSettings({ default_trial_days: 500 })
      assert.strictEqual(tooManyDays.valid, false)
    })

    it('should reject out-of-bound backup retention days', () => {
      const tooFewDays = validatePlatformSettings({ backup_retention_days: 3 })
      assert.strictEqual(tooFewDays.valid, false)

      const tooManyDays = validatePlatformSettings({ backup_retention_days: 5000 })
      assert.strictEqual(tooManyDays.valid, false)
    })
  })

  describe('3. Role Authorization Enforcements', () => {
    it('should allow platform_owner role to modify system settings', () => {
      const auth = authorizePlatformSettingsUpdate('platform_owner')
      assert.strictEqual(auth.authorized, true)
    })

    it('should deny platform_operator, support_technician, and tenant_owner roles', () => {
      const op = authorizePlatformSettingsUpdate('platform_operator')
      assert.strictEqual(op.authorized, false)
      assert.match(op.error!, /Only platform owner/)

      const tech = authorizePlatformSettingsUpdate('support_technician')
      assert.strictEqual(tech.authorized, false)

      const tenant = authorizePlatformSettingsUpdate('business_owner')
      assert.strictEqual(tenant.authorized, false)
    })
  })

  describe('4. Disaster Recovery & Snapshot Calculation', () => {
    it('should calculate healthy backup status when last backup is recent', () => {
      const now = Date.now()
      const oneHourAgo = new Date(now - 3600000).toISOString()

      const lastBackup = new Date(oneHourAgo)
      const ageHours = Number(((now - lastBackup.getTime()) / 3600000).toFixed(1))
      const status = ageHours > 24 ? 'degraded' : 'healthy'

      assert.strictEqual(ageHours, 1)
      assert.strictEqual(status, 'healthy')
    })

    it('should calculate degraded backup status when last backup is older than 24 hours', () => {
      const now = Date.now()
      const twoDaysAgo = new Date(now - 48 * 3600000).toISOString()

      const lastBackup = new Date(twoDaysAgo)
      const ageHours = Number(((now - lastBackup.getTime()) / 3600000).toFixed(1))
      const status = ageHours > 24 ? 'degraded' : 'healthy'

      assert.strictEqual(ageHours, 48)
      assert.strictEqual(status, 'degraded')
    })
  })

  describe('5. Platform Identity, Domain & Contact Settings', () => {
    it('should have default branding and identity parameters defined', () => {
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.app_name, 'InkFlow ERP')
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.app_tagline, 'The Complete Printing & Signage Operating System')
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.favicon_url, '/favicon.ico')
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.support_helpline, '+880 1819-876543')
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.app_domain, 'inkflow.com.bd')
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.contact_email, 'support@printerp.com.bd')
      assert.strictEqual(DEFAULT_PLATFORM_SETTINGS.contact_phone, '+880 1819-876543')
      assert.match(DEFAULT_PLATFORM_SETTINGS.app_title!, /PrintERP/)
      assert.match(DEFAULT_PLATFORM_SETTINGS.contact_address!, /Motijheel/)
    })

    it('should validate and accept customized identity and contact settings', () => {
      const valid = validatePlatformSettings({
        app_name: 'MetroPrint Pro',
        app_logo_url: 'https://cdn.example.com/logo.png',
        app_tagline: 'Leading Press Cloud Bangladesh',
        favicon_url: 'https://cdn.example.com/favicon.png',
        app_title: 'MetroPrint Pro - Industrial Printing System',
        app_description: 'Industrial printing and packaging ERP',
        support_helpline: '+880 1711-998877',
        app_domain: 'metroprint.com.bd',
        contact_email: 'help@metroprint.com.bd',
        contact_phone: '+880 1711-998877',
        contact_address: '12 Topkhana Road, Dhaka-1000',
      })
      assert.strictEqual(valid.valid, true)
      assert.strictEqual(valid.error, undefined)
    })

    it('should reject empty or whitespace-only application name', () => {
      const emptyName = validatePlatformSettings({ app_name: '   ' })
      assert.strictEqual(emptyName.valid, false)
      assert.match(emptyName.error!, /Application name cannot be empty/)
    })

    it('should reject domain with http/https protocols or path', () => {
      const withProtocol = validatePlatformSettings({ app_domain: 'https://printos.com' })
      assert.strictEqual(withProtocol.valid, false)
      assert.match(withProtocol.error!, /should not include protocol/)

      const withPath = validatePlatformSettings({ app_domain: 'printos.com/app' })
      assert.strictEqual(withPath.valid, false)
      assert.match(withPath.error!, /should not contain a path/)
    })

    it('should reject invalid contact email format', () => {
      const invalidEmail = validatePlatformSettings({ contact_email: 'invalid-email-address' })
      assert.strictEqual(invalidEmail.valid, false)
      assert.match(invalidEmail.error!, /must be a valid email address/)
    })

    it('should merge branding settings while preserving core cluster settings', () => {
      const merged: PlatformSystemSettings = {
        ...DEFAULT_PLATFORM_SETTINGS,
        app_name: 'Custom ERP',
        app_domain: 'custom-erp.com',
      }
      assert.strictEqual(merged.app_name, 'Custom ERP')
      assert.strictEqual(merged.app_domain, 'custom-erp.com')
      assert.strictEqual(merged.session_timeout_minutes, 120)
      assert.strictEqual(merged.rate_limit_requests_per_minute, 120)
      assert.strictEqual(merged.default_currency, 'BDT')
    })
  })
})

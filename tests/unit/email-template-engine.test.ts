import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  interpolateVariables,
  wrapHtmlEmail,
  DEFAULT_EMAIL_TEMPLATES,
} from '../../services/email-template.service.ts'

describe('Email Template Engine & Pre-Seeded Templates Unit Tests', () => {
  it('1. Correctly interpolates template variables in English', () => {
    const template = 'Dear {{customer_name}}, your invoice #{{invoice_number}} for ৳ {{amount}} is ready.'
    const vars = {
      customer_name: 'Habibullah Printing',
      invoice_number: 'INV-2026-0042',
      amount: '45,000',
    }

    const output = interpolateVariables(template, vars)
    assert.strictEqual(
      output,
      'Dear Habibullah Printing, your invoice #INV-2026-0042 for ৳ 45,000 is ready.'
    )
  })

  it('2. Correctly interpolates template variables in Bangla (বাংলা)', () => {
    const template = 'প্রিয় {{customer_name}}, আপনার ইনভয়েস #{{invoice_number}} বাবদ ৳ {{amount}} বকেয়া রয়েছে।'
    const vars = {
      customer_name: 'আকাশ আহমেদ',
      invoice_number: 'INV-091',
      amount: '১২,৫০০',
    }

    const output = interpolateVariables(template, vars)
    assert.strictEqual(
      output,
      'প্রিয় আকাশ আহমেদ, আপনার ইনভয়েস #INV-091 বাবদ ৳ ১২,৫০০ বকেয়া রয়েছে।'
    )
  })

  it('3. Cleans up missing variables without leaving raw curly brace artifacts', () => {
    const template = 'Order #{{order_number}} for {{customer_name}} - Note: {{missing_note}}'
    const vars = {
      order_number: 'ORD-101',
      customer_name: 'Vision Sign',
    }

    const output = interpolateVariables(template, vars)
    assert.strictEqual(output, 'Order #ORD-101 for Vision Sign - Note: ')
  })

  it('4. Renders responsive HTML layout with custom branding', () => {
    const bodyContent = '<p>Your quotation is ready.</p>'
    const html = wrapHtmlEmail(bodyContent, {
      companyName: 'Vision Sign BD Ltd',
      accentColor: '#2563eb',
    })

    assert.ok(html.includes('Vision Sign BD Ltd'))
    assert.ok(html.includes('<p>Your quotation is ready.</p>'))
    assert.ok(html.includes('<!DOCTYPE html>'))
    assert.ok(html.includes('#2563eb'))
  })

  it('5. Verifies all pre-seeded system templates exist with valid metadata', () => {
    assert.strictEqual(DEFAULT_EMAIL_TEMPLATES.length, 16)

    const expectedEvents = [
      'quotation_sent',
      'invoice_created',
      'payment_received',
      'due_reminder',
      'design_approval_request',
      'revision_notification',
      'approval_confirmation',
      'job_started',
      'job_completed',
      'delivery_scheduled',
      'delivery_completed',
      'user_invitation',
      'email_verification',
      'password_reset',
      'security_alert',
      'test_email',
    ]

    for (const evt of expectedEvents) {
      const found = DEFAULT_EMAIL_TEMPLATES.find((t) => t.event_type === evt)
      assert.ok(found, `Template for event '${evt}' must exist`)
      assert.ok(found.subject_template.length > 0, `Template '${evt}' must have subject`)
      assert.ok(found.body_template.length > 0, `Template '${evt}' must have body`)
      assert.ok(Array.isArray(found.variables), `Template '${evt}' must have variables array`)
    }
  })
})

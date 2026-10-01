import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyOpenWAWebhookSignature } from '../../lib/integrations/openwa/client.ts';

describe('OpenWA Webhook Security & Idempotency Tests', () => {
  const secret = 'super-secret-webhook-key-12345';
  const testPayload = JSON.stringify({
    event: 'message.received',
    timestamp: 1727760000,
    sessionId: 'tenant_test123',
    idempotencyKey: 'idemp_abc_123',
    data: {
      id: 'wamid.HBgMOTcw...',
      from: '8801712345678@c.us',
      body: 'Hello from customer',
      type: 'chat',
    },
  });

  it('1. verifyOpenWAWebhookSignature succeeds with exact HMAC sha256 signature', () => {
    const rawHash = crypto.createHmac('sha256', secret).update(testPayload, 'utf8').digest('hex');
    const signatureHeader = `sha256=${rawHash}`;

    const isValid = verifyOpenWAWebhookSignature(testPayload, signatureHeader, secret);
    assert.equal(isValid, true);
  });

  it('2. verifyOpenWAWebhookSignature rejects tampered body content', () => {
    const rawHash = crypto.createHmac('sha256', secret).update(testPayload, 'utf8').digest('hex');
    const signatureHeader = `sha256=${rawHash}`;

    const tamperedPayload = testPayload.replace('Hello', 'Tampered');
    const isValid = verifyOpenWAWebhookSignature(tamperedPayload, signatureHeader, secret);
    assert.equal(isValid, false);
  });

  it('3. verifyOpenWAWebhookSignature rejects incorrect secret key', () => {
    const rawHash = crypto.createHmac('sha256', 'wrong-secret').update(testPayload, 'utf8').digest('hex');
    const signatureHeader = `sha256=${rawHash}`;

    const isValid = verifyOpenWAWebhookSignature(testPayload, signatureHeader, secret);
    assert.equal(isValid, false);
  });

  it('4. verifyOpenWAWebhookSignature handles raw hex without sha256= prefix', () => {
    const rawHash = crypto.createHmac('sha256', secret).update(testPayload, 'utf8').digest('hex');

    const isValid = verifyOpenWAWebhookSignature(testPayload, rawHash, secret);
    assert.equal(isValid, true);
  });

  it('5. verifyOpenWAWebhookSignature fails safely on missing headers or secrets', () => {
    assert.equal(verifyOpenWAWebhookSignature(testPayload, null, secret), false);
    assert.equal(verifyOpenWAWebhookSignature(testPayload, '', secret), false);
    assert.equal(verifyOpenWAWebhookSignature(testPayload, 'sha256=123', ''), false);
  });
});

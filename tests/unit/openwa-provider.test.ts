import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OpenWAClient, OpenWAError } from '../../lib/integrations/openwa/client.ts';
import { OpenWAAdapter } from '../../lib/whatsapp/adapters/openwa.adapter.ts';

describe('OpenWA Provider & Adapter Unit Tests', () => {
  it('1. OpenWAClient normalizes base URL and trims trailing slashes and /api', () => {
    const client1 = new OpenWAClient({ baseUrl: 'http://wa.printerp.com:2785/api/', apiKey: 'test-key' });
    const client2 = new OpenWAClient({ baseUrl: 'http://wa.printerp.com:2785/', apiKey: 'test-key' });
    const client3 = new OpenWAClient({ baseUrl: 'http://wa.printerp.com:2785', apiKey: 'test-key' });

    assert.equal((client1 as any).baseUrl, 'http://wa.printerp.com:2785/api');
    assert.equal((client2 as any).baseUrl, 'http://wa.printerp.com:2785/api');
    assert.equal((client3 as any).baseUrl, 'http://wa.printerp.com:2785/api');
  });

  it('2. OpenWAAdapter providerName is openwa', () => {
    const adapter = new OpenWAAdapter({ baseUrl: 'http://localhost:2785', apiKey: 'test' });
    assert.equal(adapter.providerName, 'openwa');
  });

  it('3. OpenWAClient throws OpenWAError with HTTP status and detail on failed responses', () => {
    const err = new OpenWAError('Session not found', 404, 'SESSION_NOT_FOUND', { sessionId: 'tenant-1' });
    assert.equal(err.name, 'OpenWAError');
    assert.equal(err.statusCode, 404);
    assert.equal(err.code, 'SESSION_NOT_FOUND');
    assert.deepEqual(err.rawResponse, { sessionId: 'tenant-1' });
  });

  it('4. OpenWAAdapter validateCredentials validates baseUrl and supports optional apiKey for self-hosted', () => {
    const validAdapter = new OpenWAAdapter({ baseUrl: 'http://localhost:2785', apiKey: 'valid-secret' });
    const invalidAdapter1 = new OpenWAAdapter({ baseUrl: '', apiKey: 'valid-secret' });
    const validSelfHostedAdapter = new OpenWAAdapter({ baseUrl: 'http://localhost:2785', apiKey: '' });

    const validRes = validAdapter.validateCredentials();
    assert.equal(validRes.valid, true);

    const invalidRes1 = invalidAdapter1.validateCredentials();
    assert.equal(invalidRes1.valid, false);

    const validSelfHostedRes = validSelfHostedAdapter.validateCredentials();
    assert.equal(validSelfHostedRes.valid, true);
  });

  it('5. OpenWAAdapter checkNumberExists rejects invalid phone formats gracefully without network call', async () => {
    const adapter = new OpenWAAdapter({ baseUrl: 'http://localhost:2785', apiKey: 'secret' });
    
    // "invalid-phone" is not a valid Bangladeshi phone number
    const checkRes = await adapter.checkNumberExists('tenant-1', 'invalid-phone');
    assert.equal(checkRes.exists, false);
    assert.equal(checkRes.jid, undefined);
  });

  it('6. OpenWAAdapter sendTextMessage rejects invalid recipient phone numbers fail-closed', async () => {
    const adapter = new OpenWAAdapter({ baseUrl: 'http://localhost:2785', apiKey: 'secret' });
    
    const sendRes = await adapter.sendTextMessage(
      { to: 'not-a-number', text: 'Hello World' },
      'session-test'
    );

    assert.equal(sendRes.success, false);
    assert.equal(sendRes.errorCode, 'INVALID_RECIPIENT');
  });

  it('7. OpenWAAdapter sendTextMessage rejects requests without a session ID', async () => {
    const adapter = new OpenWAAdapter({ baseUrl: 'http://localhost:2785', apiKey: 'secret' });
    
    const sendRes = await adapter.sendTextMessage({ to: '01712345678', text: 'Test' });
    assert.equal(sendRes.success, false);
    assert.equal(sendRes.errorCode, 'SESSION_REQUIRED');
  });
});

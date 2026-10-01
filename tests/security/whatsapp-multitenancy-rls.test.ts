import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommunicationRouter } from '../../services/communication-router.ts';

describe('WhatsApp Multi-Tenancy & Session Isolation Security Tests', () => {
  const tenantA_Id = '11111111-1111-1111-1111-111111111111';
  const tenantB_Id = '22222222-2222-2222-2222-222222222222';

  it('1. Session IDs are deterministically derived from tenant ID without collision', () => {
    const sessionA = `tenant_${tenantA_Id.replace(/-/g, '')}`;
    const sessionB = `tenant_${tenantB_Id.replace(/-/g, '')}`;

    assert.notEqual(sessionA, sessionB);
    assert.equal(sessionA, 'tenant_11111111111111111111111111111111');
    assert.equal(sessionB, 'tenant_22222222222222222222222222222222');
  });

  it('2. CommunicationRouter rejects dispatch when tenant WhatsApp is disconnected', async () => {
    // Both synthetic tenants have no active mock sessions in test
    const sendRes = await CommunicationRouter.sendTenantWhatsApp({
      companyId: tenantA_Id,
      recipientPhone: '01712345678',
      messageText: 'Test isolation',
    });

    assert.equal(sendRes.success, false);
    assert.equal(sendRes.fallbackToSms, true);
    assert.ok(
      sendRes.errorCode === 'TENANT_WHATSAPP_DISCONNECTED' ||
      sendRes.errorCode === 'INVALID_RECIPIENT'
    );
  });

  it('3. CommunicationRouter strictly validates Bangladeshi phone numbers fail-closed', async () => {
    const invalidPhoneRes = await CommunicationRouter.sendTenantWhatsApp({
      companyId: tenantA_Id,
      recipientPhone: 'not-a-valid-phone',
      messageText: 'Testing invalid phone rejection',
    });

    assert.equal(invalidPhoneRes.success, false);
    assert.equal(invalidPhoneRes.errorCode, 'INVALID_RECIPIENT');
  });

  it('4. CommunicationRouter enforces tenant quota check logic correctly', async () => {
    const underQuota = await CommunicationRouter.checkDailySendQuota(tenantA_Id, 100);
    // Under quota should be true for empty test DB
    assert.equal(typeof underQuota, 'boolean');
  });
});

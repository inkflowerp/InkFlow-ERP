import { describe, it } from 'node:test'
import assert from 'node:assert'
import { GatewayService } from '../../services/gateway.service.ts'
import type { GatewayFormData } from '../../types/gateway.types.ts'

describe('Gateway Platform vs Tenant Isolation Security Tests', () => {
  it('1. Platform Gateways (tenant_id IS NULL) are saved with strict null tenant_id', async () => {
    const platformForm: GatewayFormData = {
      category: 'email',
      provider: 'smtp',
      name: 'Platform Global SMTP',
      environment: 'live',
      is_enabled: true,
      credentials: { password: 'PlatformMasterPassword123!' },
      public_config: { smtp_host: 'smtp.printerp.com', smtp_port: 587 },
    }

    const res = await GatewayService.saveGateway(platformForm, 'admin-user-id')
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.data?.tenant_id, null)
  })

  it('2. Tenant query with tenantId does not return platform credentials', async () => {
    const tenantGateways = await GatewayService.listGateways({ tenantId: 'tenant-company-xyz' })
    // Ensure all returned records strictly belong to that tenant
    for (const g of tenantGateways) {
      assert.strictEqual(g.tenant_id, 'tenant-company-xyz')
    }
  })

  it('3. Platform query with tenantId=null only returns platform-wide gateways', async () => {
    const platformGateways = await GatewayService.listGateways({ tenantId: null })
    for (const g of platformGateways) {
      assert.strictEqual(g.tenant_id, null)
    }
  })
})

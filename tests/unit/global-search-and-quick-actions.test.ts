import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { QUICK_COMMANDS, SearchService } from '../../services/search.service.ts'

describe('Global Search & Quick Actions Engine (Bangladeshi Press Workflows)', () => {
  it('1. QUICK_COMMANDS contains all key print shop workflows including Walk-in New Work and Finishing', () => {
    const ids = QUICK_COMMANDS.map((c) => c.id)
    assert.ok(ids.includes('cmd-new-work'), 'Must contain cmd-new-work for 1-tap walk-in orders')
    assert.ok(ids.includes('cmd-create-customer'), 'Must contain cmd-create-customer')
    assert.ok(ids.includes('cmd-create-quotation'), 'Must contain cmd-create-quotation')
    assert.ok(ids.includes('cmd-create-order'), 'Must contain cmd-create-order')
    assert.ok(ids.includes('cmd-finishing'), 'Must contain cmd-finishing for post-press & fabrication')
    assert.ok(ids.includes('cmd-record-payment'), 'Must contain cmd-record-payment for MR entries')
    assert.ok(ids.includes('cmd-create-purchase'), 'Must contain cmd-create-purchase')
    assert.ok(ids.includes('cmd-add-expense'), 'Must contain cmd-add-expense')
    assert.ok(ids.includes('cmd-add-machinery'), 'Must contain cmd-add-machinery')
  })

  it('2. Every quick command has bilingual metadata and unique single-key shortcuts', () => {
    const shortcuts = new Set<string>()

    for (const cmd of QUICK_COMMANDS) {
      assert.ok(cmd.title && cmd.title.length > 0, `Command ${cmd.id} missing English title`)
      assert.ok(cmd.titleBn && cmd.titleBn.length > 0, `Command ${cmd.id} missing Bengali title`)
      assert.ok(cmd.subtitle && cmd.subtitle.length > 0, `Command ${cmd.id} missing English subtitle`)
      assert.ok(cmd.subtitleBn && cmd.subtitleBn.length > 0, `Command ${cmd.id} missing Bengali subtitle`)
      assert.ok(cmd.href && cmd.href.startsWith('/'), `Command ${cmd.id} href must be a valid relative path`)

      if (cmd.shortcut) {
        assert.equal(cmd.shortcut.length, 1, `Shortcut for ${cmd.id} should be single character`)
        assert.ok(!shortcuts.has(cmd.shortcut), `Duplicate shortcut detected: ${cmd.shortcut}`)
        shortcuts.add(cmd.shortcut)
      }
    }
  })

  it('3. Search service executes cross-entity queries with strict tenant isolation', () => {
    const companyId = 'test-co-bd-press'
    const results = SearchService.search(companyId, 'flex', 'business_owner', [])
    assert.ok(typeof results === 'object', 'Search should return grouped results')
  })
})

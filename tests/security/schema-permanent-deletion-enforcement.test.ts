import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Automated CI Schema Guard: Tenant Table Deletion & RLS Enforcement', () => {
  const migrationsDir = path.resolve('supabase/migrations')
  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

  const tables = new Map<string, {
    name: string
    hasCompanyId: boolean
    hasTenantId: boolean
    hasRLS: boolean
    fks: Array<{ targetTable: string; targetCol: string }>
  }>()

  // 1. Parse all SQL migrations
  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi
    let match: RegExpExecArray | null

    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1].toLowerCase()
      const body = match[2]

      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          hasCompanyId: false,
          hasTenantId: false,
          hasRLS: false,
          fks: [],
        })
      }

      const tableInfo = tables.get(tableName)!
      const lines = body.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        const colMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)/)
        if (colMatch && !['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK'].includes(colMatch[1].toUpperCase())) {
          const col = colMatch[1].toLowerCase()
          if (col === 'company_id') tableInfo.hasCompanyId = true
          if (col === 'tenant_id') tableInfo.hasTenantId = true
        }

        const fkMatch = trimmed.match(/REFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/i)
        if (fkMatch) {
          tableInfo.fks.push({
            targetTable: fkMatch[1].toLowerCase(),
            targetCol: fkMatch[2].toLowerCase(),
          })
        }
      }
    }

    const rlsRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi
    let rlsMatch: RegExpExecArray | null
    while ((rlsMatch = rlsRegex.exec(content)) !== null) {
      const tableName = rlsMatch[1].toLowerCase()
      if (tables.has(tableName)) {
        tables.get(tableName)!.hasRLS = true
      }
    }
  }

  // 2. Parse Migration 093 delete statements
  const mig93Content = fs.readFileSync(path.join(migrationsDir, '093_permanent_tenant_deletion_and_cleanup.sql'), 'utf8')
  const mig93DeletedTables = new Set<string>()
  const deleteRegex = /DELETE\s+FROM\s+(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi
  let delMatch: RegExpExecArray | null
  while ((delMatch = deleteRegex.exec(mig93Content)) !== null) {
    mig93DeletedTables.add(delMatch[1].toLowerCase())
  }

  // 3. Parse PlatformService.childTables
  const platformServiceFile = path.resolve('services/platform.service.ts')
  const platformServiceContent = fs.readFileSync(platformServiceFile, 'utf8')
  const childTablesMatch = platformServiceContent.match(/const\s+childTables\s*=\s*\[([\s\S]*?)\]/i)
  const childTablesSet = new Set<string>()
  if (childTablesMatch) {
    const rawList = childTablesMatch[1]
    const tableNames = rawList.match(/'([a-zA-Z0-9_]+)'/g)?.map((s) => s.replace(/'/g, '').toLowerCase()) || []
    tableNames.forEach((t) => childTablesSet.add(t))
  }

  it('1. Confirms all direct tenant-owned tables are registered in delete_tenant_permanently RPC', () => {
    const directTenantTables = Array.from(tables.values()).filter(
      (t) => (t.hasCompanyId || t.hasTenantId || t.name === 'companies') && t.name !== 'platform_audit_logs'
    )

    const missingInRpc: string[] = []
    for (const t of directTenantTables) {
      if (!mig93DeletedTables.has(t.name)) {
        missingInRpc.push(t.name)
      }
    }

    assert.strictEqual(
      missingInRpc.length,
      0,
      `Found ${missingInRpc.length} tenant tables missing from Migration 093 RPC deletion: ${missingInRpc.join(', ')}`
    )
  })

  it('2. Confirms all direct tenant-owned tables are registered in PlatformService.childTables', () => {
    const directTenantTables = Array.from(tables.values()).filter(
      (t) => (t.hasCompanyId || t.hasTenantId) && t.name !== 'platform_audit_logs' && t.name !== 'companies'
    )

    const missingInService: string[] = []
    for (const t of directTenantTables) {
      if (!childTablesSet.has(t.name)) {
        missingInService.push(t.name)
      }
    }

    assert.strictEqual(
      missingInService.length,
      0,
      `Found ${missingInService.length} tenant tables missing from PlatformService.childTables: ${missingInService.join(', ')}`
    )
  })

  it('3. Confirms all tenant-owned tables have RLS enabled', () => {
    const directTenantTables = Array.from(tables.values()).filter(
      (t) => (t.hasCompanyId || t.hasTenantId || t.name === 'companies') && t.name !== 'platform_audit_logs'
    )

    const missingRLS: string[] = []
    for (const t of directTenantTables) {
      if (!t.hasRLS) {
        missingRLS.push(t.name)
      }
    }

    assert.strictEqual(
      missingRLS.length,
      0,
      `Found ${missingRLS.length} tenant tables missing RLS enablement: ${missingRLS.join(', ')}`
    )
  })
})

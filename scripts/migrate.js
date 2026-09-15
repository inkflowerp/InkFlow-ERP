/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// Helper to split SQL by semicolons, respecting quotes and comments
function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let inString = false
  let stringChar = ''
  let inDollarQuote = false
  let dollarTag = ''
  let inLineComment = false
  let inBlockComment = false

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const next = sql[i + 1] || ''

    if (inLineComment) {
      current += char
      if (char === '\n') inLineComment = false
      continue
    }

    if (inBlockComment) {
      current += char
      if (char === '*' && next === '/') {
        current += '/'
        i++
        inBlockComment = false
      }
      continue
    }

    if (inString) {
      current += char
      if (char === stringChar) {
        if (next === stringChar) {
          current += stringChar
          i++
        } else {
          inString = false
        }
      }
      continue
    }

    if (inDollarQuote) {
      current += char
      if (char === '$') {
        const checkTag = sql.slice(i, i + dollarTag.length)
        if (checkTag === dollarTag) {
          current += dollarTag.slice(1)
          i += dollarTag.length - 1
          inDollarQuote = false
        }
      }
      continue
    }

    // Check starts
    if (char === '-' && next === '-') {
      inLineComment = true
      current += '--'
      i++
      continue
    }
    if (char === '/' && next === '*') {
      inBlockComment = true
      current += '/*'
      i++
      continue
    }
    if (char === "'" || char === '"') {
      inString = true
      stringChar = char
      current += char
      continue
    }
    if (char === '$') {
      const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/)
      if (match) {
        inDollarQuote = true
        dollarTag = match[1]
        current += dollarTag
        i += dollarTag.length - 1
        continue
      }
    }

    if (char === ';') {
      if (current.trim()) {
        statements.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

async function runMigrations() {
  const password = 'Shamol199431)!'
  const regions = [
    'ap-northeast-1', // Tokyo (active host for liqhihsqcblddqfjmmse)
    'ap-south-1',
    'ap-southeast-1',
    'ap-northeast-2',
    'us-east-1',
    'us-east-2',
  ]

  const connectionConfigs = []
  for (const reg of regions) {
    connectionConfigs.push({
      host: `aws-0-${reg}.pooler.supabase.com`,
      port: 5432,
      user: 'postgres.liqhihsqcblddqfjmmse',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      statement_timeout: 60000,
    })
  }

  let client = null
  for (const cfg of connectionConfigs) {
    try {
      console.log(`Connecting to ${cfg.host}:${cfg.port}...`)
      const testClient = new Client(cfg)
      await testClient.connect()
      console.log(`✓ Connected successfully to ${cfg.host}:${cfg.port}!`)
      client = testClient
      break
    } catch (err) {
      console.warn(`Could not connect to ${cfg.host}:${cfg.port}: ${err.message}`)
    }
  }

  if (!client) {
    console.error('Failed to establish database connection across all endpoints.')
    process.exit(1)
  }

  try {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    console.log(`\nStarting migration sequence: ${migrationFiles.length} migrations to execute...\n`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS _printerp_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `)

    const forceArg = process.argv.find((a) => a.startsWith('--force='))?.split('=')[1] || process.argv[2] === '--force' ? process.argv[3] : null

    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i]
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')

      // Check if already applied
      const shouldForce = forceArg === 'all' || (forceArg && file.includes(forceArg))
      if (!shouldForce) {
        const existing = await client.query('SELECT name FROM _printerp_migrations WHERE name = $1', [file])
        if (existing.rows.length > 0) {
          console.log(`[${i + 1}/${migrationFiles.length}] Already applied: ${file}`)
          continue
        }
      }

      console.log(`[${i + 1}/${migrationFiles.length}] Applying migration: ${file}...`)
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO _printerp_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file])
        await client.query('COMMIT')
        console.log(`✓ Applied ${file} successfully.`)
      } catch (migrationErr) {
        await client.query('ROLLBACK')
        console.warn(`⚠️ Whole-file execution for ${file} failed (${migrationErr.message}). Retrying statement-by-statement with idempotent error handling...`)

        // Fallback: Run statement by statement
        const statements = splitSqlStatements(sql)
        let successCount = 0

        for (const stmt of statements) {
          if (!stmt.trim()) continue
          try {
            await client.query(stmt)
            successCount++
          } catch (stmtErr) {
            // Safe errors to ignore: object already exists, column already exists, policy already exists, constraint already exists
            const ignorableCodes = ['42710', '42P07', '42701', '42P16', '42P06']
            if (
              ignorableCodes.includes(stmtErr.code) ||
              stmtErr.message.includes('already exists') ||
              stmtErr.message.includes('multiple primary keys')
            ) {
              // Expected idempotent clash
              successCount++
            } else {
              console.error(`Statement error in ${file}:`, stmtErr.message, '\nStatement:', stmt.slice(0, 150))
              throw stmtErr
            }
          }
        }

        await client.query('INSERT INTO _printerp_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file])
        console.log(`✓ Applied ${file} via statement execution (${successCount} statements).`)
      }
    }

    console.log(`\n🎉 All ${migrationFiles.length} migrations applied successfully to Supabase!`)

    // Verify 080 columns
    const invCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `)
    console.log(`\n✓ Invoices table columns in PostgreSQL:`, invCols.rows.map(r => `${r.column_name} (${r.data_type})`))

    const itemCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_items' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `)
    console.log(`\n✓ Invoice_items table columns in PostgreSQL:`, itemCols.rows.map(r => `${r.column_name} (${r.data_type})`))

  } finally {
    await client.end()
  }
}

runMigrations().catch((err) => {
  console.error('\nFatal migration error:', err)
  process.exit(1)
})

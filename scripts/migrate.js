const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function runMigrations() {
  const password = 'Shamol199431)!'
  const regions = [
    'ap-northeast-1',   // Tokyo (Verified active host for liqhihsqcblddqfjmmse)
    'ap-south-1',
    'ap-southeast-1',
    'ap-northeast-2',   // Seoul
    'eu-central-1',     // Frankfurt
    'eu-west-1',        // Ireland
    'eu-west-2',        // London
    'eu-west-3',        // Paris
    'us-east-1',        // North Virginia
    'us-east-2',        // Ohio
    'us-west-1',        // North California
    'us-west-2',        // Oregon
    'sa-east-1',        // São Paulo
    'ca-central-1'      // Central Canada
  ]

  const connectionConfigs = []

  for (const reg of regions) {
    // Session mode (port 5432)
    connectionConfigs.push({
      host: `aws-0-${reg}.pooler.supabase.com`,
      port: 5432,
      user: 'postgres.liqhihsqcblddqfjmmse',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      statement_timeout: 60000,
    })
    // Transaction mode (port 6543)
    connectionConfigs.push({
      host: `aws-0-${reg}.pooler.supabase.com`,
      port: 6543,
      user: 'postgres.liqhihsqcblddqfjmmse',
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      statement_timeout: 60000,
    })
  }

  let client = null
  let connectedConfig = null

  for (const cfg of connectionConfigs) {
    try {
      console.log(`Connecting to ${cfg.host}:${cfg.port}...`)
      const testClient = new Client(cfg)
      await testClient.connect()
      console.log(`✓ Connected successfully to ${cfg.host}:${cfg.port}!`)
      client = testClient
      connectedConfig = cfg
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

    // Create migrations history table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _printerp_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `)

    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i]
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')

      // Check if already applied
      const existing = await client.query('SELECT name FROM _printerp_migrations WHERE name = $1', [file])
      if (existing.rows.length > 0) {
        console.log(`[${i + 1}/${migrationFiles.length}] Already applied: ${file}`)
        continue
      }

      console.log(`[${i + 1}/${migrationFiles.length}] Applying migration: ${file}...`)
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO _printerp_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`✓ Applied ${file} successfully.`)
      } catch (migrationErr) {
        await client.query('ROLLBACK')
        console.error(`❌ Migration failed at ${file}:`, migrationErr.message)
        throw migrationErr
      }
    }

    // Query tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `)

    console.log(`\n🎉 All 30 migrations applied successfully!`)
    console.log(`Total public tables created: ${tablesRes.rows.length}`)
    console.log(`Tables:\n` + tablesRes.rows.map((r) => `  - ${r.table_name}`).join('\n'))
  } finally {
    await client.end()
  }
}

runMigrations().catch((err) => {
  console.error('\nFatal migration error:', err)
  process.exit(1)
})

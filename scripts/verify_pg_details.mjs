import { Client } from 'pg'

async function checkDetails() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.liqhihsqcblddqfjmmse',
    password: 'Shamol199431)!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()

  // All routines in public schema
  const rpcs = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    ORDER BY routine_name;
  `)
  console.log('\n--- All Public Routines in PostgreSQL ---')
  console.log(rpcs.rows.map(r => r.routine_name))

  await client.end()
}

checkDetails().catch(console.error)

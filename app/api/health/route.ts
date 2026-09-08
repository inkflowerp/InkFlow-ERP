import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    app: 'PrintERP SaaS',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    region: 'BD',
    currency: 'BDT',
  })
}

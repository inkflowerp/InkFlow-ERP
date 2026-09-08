'use client'

import React, { useState, useEffect } from 'react'
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  PhoneCall,
  DollarSign,
  HardDrive,
  FileCheck2,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlatformService } from '@/services/platform.service'
import { IntegrationProviderStatus } from '@/types/platform.types'

export default function PlatformIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationProviderStatus[]>([])
  const [loading, setLoading] = useState(true)

  const loadIntegrations = async () => {
    setLoading(true)
    const res = await PlatformService.getIntegrationsHealth()
    if (res.success && res.data) {
      setIntegrations(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadIntegrations()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            External Gateways &amp; Third-Party Services
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Layers className="h-7 w-7 text-indigo-400" />
            Integration Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time health and latency telemetry for WhatsApp, SMS Gateways, bKash checkout, SSLCommerz, and NBR tax sync.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadIntegrations}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Secret Redaction Notice */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          <span>Security Policy Active: API keys, tokens, and gateway secrets are redacted and encrypted server-side.</span>
        </span>
        <span className="text-[10px] font-mono text-emerald-400 font-bold">AES-256 ENCRYPTED</span>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((it) => {
          const isOperational = it.status === 'operational'
          const isDegraded = it.status === 'degraded'

          return (
            <Card key={it.key} className="bg-slate-900 border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-sm">{it.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{it.key}</div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isOperational
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isDegraded
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {it.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500">API Latency</div>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">{it.latency_ms} ms</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Failure Rate</div>
                  <div className={`font-mono font-bold text-sm mt-0.5 ${it.failure_rate_pct > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {it.failure_rate_pct}%
                  </div>
                </div>
              </div>

              {it.notes && (
                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  {it.notes}
                </div>
              )}

              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                <span>Last successful call:</span>
                <span className="font-mono text-slate-300">{it.last_success_at}</span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

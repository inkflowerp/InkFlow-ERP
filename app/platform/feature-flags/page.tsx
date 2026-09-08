'use client'

import React, { useState, useEffect } from 'react'
import {
  Flag,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Globe,
  SlidersHorizontal,
  MessageSquare,
  FileCheck2,
  Sparkles,
  PhoneCall,
  Printer,
  GitFork,
  X,
  Plus,
  RefreshCw,
  Info,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlatformService } from '@/services/platform.service'
import {
  PlatformFeatureFlagItem,
  PlatformTenantCompany,
} from '@/types/platform.types'
import {
  toggleGlobalFeatureFlagAction,
  setTenantFeatureFlagAction,
  removeTenantFeatureFlagAction,
} from '@/actions/platform.actions'

const FLAG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp_notifications: MessageSquare,
  mushak_6_3: FileCheck2,
  ai_job_estimator: Sparkles,
  bd_sms_gateway: PhoneCall,
  thermal_receipt_esc_pos: Printer,
  multi_branch_dispatch: GitFork,
}

export default function PlatformFeatureFlagsPage() {
  const [activeTab, setActiveTab] = useState<'global' | 'tenants'>('global')
  const [flags, setFlags] = useState<PlatformFeatureFlagItem[]>([])
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('c-01')
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

  // Add Override Modal State
  const [overrideModalFlag, setOverrideModalFlag] = useState<PlatformFeatureFlagItem | null>(null)
  const [overrideCompanyId, setOverrideCompanyId] = useState<string>('c-01')
  const [overrideState, setOverrideState] = useState<boolean>(true)
  const [overrideNotes, setOverrideNotes] = useState<string>('')
  const [isSavingOverride, setIsSavingOverride] = useState(false)

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    const [flagRes, compRes] = await Promise.all([
      PlatformService.getFeatureFlags(),
      PlatformService.getCompanies(),
    ])
    if (flagRes.success && flagRes.data) setFlags(flagRes.data)
    if (compRes.success && compRes.data) {
      setCompanies(compRes.data)
      if (compRes.data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(compRes.data[0].id)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Toggle Global Flag
  const handleToggleGlobal = async (flagId: string, currentState: boolean) => {
    const nextState = !currentState
    // Optimistic
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId || f.key === flagId ? { ...f, is_enabled: nextState } : f))
    )

    const res = await toggleGlobalFeatureFlagAction(flagId, nextState)
    if (res.success) {
      showNotification(`Platform-wide feature flag "${flagId}" set to ${nextState ? 'ENABLED' : 'DISABLED'}.`)
    } else {
      showNotification('Failed to toggle flag', 'error')
      loadData()
    }
  }

  // Open Override Dialog
  const handleOpenOverrideModal = (flag: PlatformFeatureFlagItem) => {
    setOverrideModalFlag(flag)
    setOverrideCompanyId(selectedCompanyId || companies[0]?.id || 'c-01')
    setOverrideState(true)
    setOverrideNotes('')
  }

  // Save Tenant Override
  const handleSaveTenantOverride = async () => {
    if (!overrideModalFlag) return
    setIsSavingOverride(true)

    const res = await setTenantFeatureFlagAction(
      overrideModalFlag.key,
      overrideCompanyId,
      overrideState,
      overrideNotes || 'Custom tenant override set by platform owner'
    )

    if (res.success && res.data) {
      setFlags((prev) =>
        prev.map((f) => (f.key === overrideModalFlag.key ? res.data! : f))
      )
      const compName = companies.find((c) => c.id === overrideCompanyId)?.name || 'Tenant'
      showNotification(
        `Assigned tenant override for ${compName}: ${overrideState ? 'ENABLED' : 'DISABLED'}.`
      )
      setOverrideModalFlag(null)
    } else {
      showNotification('Failed to set tenant override', 'error')
    }
    setIsSavingOverride(false)
  }

  // Remove Tenant Override
  const handleRemoveOverride = async (flagKey: string, companyId: string) => {
    const res = await removeTenantFeatureFlagAction(flagKey, companyId)
    if (res.success && res.data) {
      setFlags((prev) => prev.map((f) => (f.key === flagKey ? res.data! : f)))
      showNotification('Reverted tenant override back to platform global default.')
    } else {
      showNotification('Failed to remove override', 'error')
    }
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Flag className="h-7 w-7 text-indigo-400" />
            Feature Flags Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Govern platform-wide product modules, experimental print algorithms, and assign tenant-specific feature overrides.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'global'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Platform-Wide ({flags.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'tenants'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Tenant-Specific Overrides</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TAB 1: PLATFORM-WIDE FEATURE FLAGS */}
      {activeTab === 'global' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Global platform defaults apply to all tenant organizations unless explicitly overridden.</span>
            <span className="font-mono text-slate-500">6 Modules Loaded</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {flags.map((flag) => {
              const Icon = FLAG_ICONS[flag.key] || Flag
              return (
                <Card
                  key={flag.id}
                  className="bg-slate-900 border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl transition-all shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          flag.is_enabled
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xs shadow-indigo-500/20'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-sm text-white">{flag.name}</h3>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                            {flag.key}
                          </span>
                          {flag.overrides_count > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {flag.overrides_count} Tenant Override{flag.overrides_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                          {flag.description}
                        </p>
                      </div>
                    </div>

                    {/* Toggle and Override Actions */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenOverrideModal(flag)}
                        className="h-8 px-2.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl"
                      >
                        <SlidersHorizontal className="h-3 w-3 mr-1 text-cyan-400" />
                        <span>Override Tenant</span>
                      </Button>

                      {/* Switch Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleGlobal(flag.key, flag.is_enabled)}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          flag.is_enabled ? 'bg-indigo-600 shadow-md shadow-indigo-600/30' : 'bg-slate-800'
                        }`}
                        title={`Click to ${flag.is_enabled ? 'disable' : 'enable'} platform-wide`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            flag.is_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TENANT-SPECIFIC FEATURE FLAGS */}
      {activeTab === 'tenants' && (
        <div className="space-y-6">
          {/* Company Picker Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Selected Tenant Organization
                </div>
                <div className="font-bold text-sm text-white">
                  {selectedCompany ? selectedCompany.name : 'Choose a tenant'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Switch Company:</span>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 max-w-xs"
              >
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.plan.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of Flags with Tenant Status */}
          <div className="space-y-3.5">
            {flags.map((flag) => {
              const Icon = FLAG_ICONS[flag.key] || Flag
              const override = flag.overrides.find((o) => o.company_id === selectedCompanyId)
              const effectiveStatus = override !== undefined ? override.is_enabled : flag.is_enabled
              const isOverridden = override !== undefined

              return (
                <Card
                  key={flag.id}
                  className={`border p-4 sm:p-5 rounded-2xl transition-all ${
                    isOverridden
                      ? 'bg-slate-900/90 border-cyan-800/60 shadow-lg shadow-cyan-950/20'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          effectiveStatus
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{flag.name}</h4>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {flag.key}
                          </span>
                          {isOverridden ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              Custom Tenant Override Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              Inherited Global Default ({flag.is_enabled ? 'Enabled' : 'Disabled'})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 max-w-2xl">{flag.description}</p>
                        {override?.notes && (
                          <div className="text-[11px] text-cyan-300/90 font-mono mt-1">
                            Note: {override.notes} (Set: {override.updated_at})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isOverridden ? (
                        <>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                              effectiveStatus
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                : 'bg-red-950/60 text-red-400 border-red-800'
                            }`}
                          >
                            {effectiveStatus ? 'FORCED ON' : 'FORCED OFF'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveOverride(flag.key, selectedCompanyId)}
                            className="h-8 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Revert to Platform Global Default"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            Revert
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setOverrideModalFlag(flag)
                            setOverrideCompanyId(selectedCompanyId)
                            setOverrideState(!flag.is_enabled)
                            setOverrideNotes('')
                          }}
                          className="h-8 px-2.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 border border-cyan-800/40 rounded-lg"
                        >
                          <SlidersHorizontal className="h-3 w-3 mr-1" />
                          Set Custom Override
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL: SET TENANT OVERRIDE */}
      {overrideModalFlag && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setOverrideModalFlag(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Set Tenant Feature Override</h3>
                <p className="text-xs text-slate-400">{overrideModalFlag.name}</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Target Tenant Organization</label>
                <select
                  value={overrideCompanyId}
                  onChange={(e) => setOverrideCompanyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden"
                >
                  {companies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} ({comp.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Override State</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideState(true)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      overrideState
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Force Enable (ON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideState(false)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      !overrideState
                        ? 'bg-red-600/20 border-red-500 text-red-300 ring-1 ring-red-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Force Disable (OFF)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Override Notes</label>
                <Input
                  placeholder="e.g. VIP client requesting early access or opt-out"
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrideModalFlag(null)}
                className="bg-slate-800 border-slate-700 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSavingOverride}
                onClick={handleSaveTenantOverride}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                {isSavingOverride ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                Save Tenant Override
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

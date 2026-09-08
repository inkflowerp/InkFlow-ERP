'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertOctagon,
  ShieldAlert,
  Flame,
  Power,
  RefreshCw,
  MessageSquare,
  PhoneCall,
  CreditCard,
  Building2,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  X,
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPlatformEmergencyControlsAction } from '@/actions/platform-data.actions'
import { EmergencyControlItem } from '@/types/platform.types'
import { setEmergencyControlAction } from '@/actions/platform.actions'

const CONTROL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pause_whatsapp: MessageSquare,
  pause_sms: PhoneCall,
  pause_payments: CreditCard,
  pause_new_tenants: Building2,
  maintenance_mode: ShieldAlert,
  pause_background_jobs: Cpu,
}

export default function PlatformEmergencyPage() {
  const [controls, setControls] = useState<EmergencyControlItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Confirmation Modal State
  const [activeModalControl, setActiveModalControl] = useState<EmergencyControlItem | null>(null)
  const [targetState, setTargetState] = useState<boolean>(false)
  const [reason, setReason] = useState<string>('')
  const [confirmInput, setConfirmInput] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadControls = async () => {
    setLoading(true)
    const res = await getPlatformEmergencyControlsAction()
    if (res.success && res.data) {
      setControls(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadControls()
  }, [])

  const openConfirmationModal = (control: EmergencyControlItem, nextState: boolean) => {
    setActiveModalControl(control)
    setTargetState(nextState)
    setReason('')
    setConfirmInput('')
  }

  const closeConfirmationModal = () => {
    setActiveModalControl(null)
    setReason('')
    setConfirmInput('')
    setIsProcessing(false)
  }

  const handleExecuteEmergencyAction = async () => {
    if (!activeModalControl) return
    if (!reason.trim()) {
      showNotification('A clear mandatory justification reason is required for emergency actions.', 'error')
      return
    }
    if (confirmInput.trim().toUpperCase() !== 'CONFIRM') {
      showNotification('Type CONFIRM in uppercase to proceed.', 'error')
      return
    }

    setIsProcessing(true)
    const res = await setEmergencyControlAction(
      activeModalControl.control_key,
      targetState,
      reason.trim()
    )

    if (res.success) {
      setControls((prev) =>
        prev.map((c) =>
          c.control_key === activeModalControl.control_key
            ? { ...c, is_active: targetState, reason: reason.trim(), activated_at: targetState ? new Date().toISOString() : undefined }
            : c
        )
      )
      showNotification(
        `Emergency control "${activeModalControl.name}" is now ${targetState ? 'ACTIVE' : 'DEACTIVATED'}.`,
        'success'
      )
      closeConfirmationModal()
    } else {
      showNotification(res.error || 'Failed to update emergency control', 'error')
      setIsProcessing(false)
    }
  }

  const activeControlsCount = controls.filter((c) => c.is_active).length

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with High-Risk Styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-950/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Flame className="h-6 w-6 text-rose-500" />
            </div>
            Emergency Platform Controls
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global high-blast-radius kill switches for catastrophic incident mitigation, payment freezing, and disaster lockdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadControls}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh Controls
          </Button>
        </div>
      </div>

      {/* Active Kill Switches Alert Banner */}
      {activeControlsCount > 0 ? (
        <div className="bg-rose-950/60 border-2 border-rose-500/50 rounded-2xl p-4 sm:p-5 text-rose-200 flex items-start gap-4 shadow-2xl animate-pulse">
          <AlertOctagon className="h-7 w-7 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-base text-rose-300 flex items-center gap-2">
              <span>{activeControlsCount} EMERGENCY KILL SWITCHES ARE CURRENTLY ACTIVE</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-900 text-rose-100 border border-rose-700">
                HIGH ALERT
              </span>
            </div>
            <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
              One or more platform-wide subsystems are currently frozen. Tenant operations, automated webhooks, or payment processing may be blocked across the cluster.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-900/60 rounded-2xl p-4 text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold text-emerald-300">All Emergency Controls Normal.</span> All cluster dispatchers, SMS/WhatsApp gateways, and payment pipelines are operating unthrottled.
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <Info className="h-4 w-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {controls.map((control) => {
          const Icon = CONTROL_ICONS[control.control_key] || AlertTriangle
          return (
            <Card
              key={control.id}
              className={`rounded-2xl border transition-all ${
                control.is_active
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        control.is_active
                          ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                          : 'bg-slate-800 border-slate-700/60 text-slate-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        {control.name}
                        {control.is_active && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {control.description}
                      </p>
                    </div>
                  </div>
                </div>

                {control.is_active && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Activated by:</span>
                      <span className="font-mono text-slate-200">{control.activated_by_email || 'Platform Owner'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Reason:</span>
                      <span className="text-rose-300 italic truncate max-w-[220px]">{control.reason || 'Incident mitigation'}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Status: <span className={control.is_active ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>{control.is_active ? 'ENABLED (KILL SWITCH ON)' : 'OFF (NORMAL)'}</span>
                  </span>

                  {control.is_active ? (
                    <Button
                      size="sm"
                      onClick={() => openConfirmationModal(control, false)}
                      className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                    >
                      <Unlock className="h-3.5 w-3.5 mr-1.5" />
                      Restore Normal Flow
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openConfirmationModal(control, true)}
                      className="h-8 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl"
                    >
                      <Power className="h-3.5 w-3.5 mr-1.5" />
                      Activate Kill Switch
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Confirmation & Audit Justification Modal */}
      {activeModalControl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className={`p-5 border-b flex items-center justify-between ${targetState ? 'bg-rose-950/60 border-rose-900' : 'bg-emerald-950/60 border-emerald-900'}`}>
              <div className="flex items-center gap-2.5">
                <AlertOctagon className={`h-5 w-5 ${targetState ? 'text-rose-400' : 'text-emerald-400'}`} />
                <h3 className="font-bold text-base text-white">
                  {targetState ? 'Confirm Emergency Kill Switch' : 'Confirm Control Deactivation'}
                </h3>
              </div>
              <button
                onClick={closeConfirmationModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <div className="font-semibold text-white mb-1">{activeModalControl.name}</div>
                <p className="text-slate-400">{activeModalControl.description}</p>
              </div>

              {targetState && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    High Blast Radius Action
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    This action immediately takes effect cluster-wide across all active tenant companies. It will be recorded permanently in the platform immutable audit trail.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Mandatory Operational Justification Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g., Mitigating upstream SMS provider outage or patching webhook loop..."
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-hidden focus:border-rose-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Type <span className="font-mono text-rose-400 font-bold">CONFIRM</span> to authenticate mutation:
                </label>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="CONFIRM"
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 font-mono focus:border-rose-500 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeConfirmationModal}
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isProcessing || !reason.trim() || confirmInput.trim().toUpperCase() !== 'CONFIRM'}
                  onClick={handleExecuteEmergencyAction}
                  className={`h-9 text-xs font-bold ${
                    targetState
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isProcessing ? 'Executing...' : targetState ? 'Activate Kill Switch' : 'Restore Subsystem'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

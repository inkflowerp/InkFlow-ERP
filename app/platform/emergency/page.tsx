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
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-destructive/30 pb-5">
 <div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
 <Flame className="h-6 w-6 text-destructive" />
 </div>
 Emergency Platform Controls
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 Global high-blast-radius kill switches for catastrophic incident mitigation, payment freezing, and disaster lockdown.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={loadControls}
 className="h-9 text-xs border-border bg-card text-muted-foreground hover:bg-muted"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 Refresh Controls
 </Button>
 </div>
 </div>

 {/* Active Kill Switches Alert Banner */}
 {activeControlsCount > 0 ? (
 <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 sm:p-5 text-destructive flex items-start gap-4 shadow-xs animate-pulse">
 <AlertOctagon className="h-7 w-7 text-destructive shrink-0 mt-0.5" />
 <div className="flex-1">
 <div className="font-bold text-base text-destructive flex items-center gap-2">
 <span>{activeControlsCount} EMERGENCY KILL SWITCHES ARE CURRENTLY ACTIVE</span>
 <span className="px-2 py-0.5 rounded-full text-2xs tabular-nums bg-destructive/10 text-destructive border border-destructive/30">
 HIGH ALERT
 </span>
 </div>
 <p className="text-xs text-destructive/90 mt-1 leading-relaxed">
 One or more system services are stopped. Client actions or payment processing may be paused.
 </p>
 </div>
 </div>
 ) : (
 <div className="bg-success-surface border border-success/30 rounded-2xl p-4 text-success flex items-center gap-3">
 <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
 <div className="text-xs sm:text-sm">
 <span className="font-semibold text-success">All Emergency Controls Normal.</span> All cluster dispatchers, SMS/WhatsApp gateways, and payment pipelines are operating unthrottled.
 </div>
 </div>
 )}

 {/* Toast Notification */}
 {notification && (
 <div
 className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
 notification.type === 'success'
 ? 'bg-success-surface border-success/30 text-success'
 : 'bg-destructive/10 border-destructive/30 text-destructive'
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
 ? 'bg-destructive/10 border-destructive/30 shadow-xs'
 : 'bg-card border-border'
 }`}
 >
 <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-start gap-3.5">
 <div
 className={`p-2.5 rounded-xl border ${
 control.is_active
 ? 'bg-destructive/20 border-destructive/30 text-destructive'
 : 'bg-muted border-border text-muted-foreground'
 }`}
 >
 <Icon className="h-5 w-5" />
 </div>
 <div>
 <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
 {control.name}
 {control.is_active && (
 <span className="px-2 py-0.5 rounded text-2xs font-bold bg-destructive text-destructive-foreground uppercase tracking-wider">
 Active
 </span>
 )}
 </h3>
 <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
 {control.description}
 </p>
 </div>
 </div>
 </div>

 {control.is_active && (
 <div className="p-3 rounded-xl bg-card border border-destructive/30 text-xs text-muted-foreground space-y-1">
 <div className="flex items-center justify-between text-muted-foreground text-2xs">
 <span>Activated by:</span>
 <span className="tabular-nums text-foreground">{control.activated_by_email || 'Platform Owner'}</span>
 </div>
 <div className="flex items-center justify-between text-muted-foreground text-2xs">
 <span>Reason:</span>
 <span className="text-destructive italic truncate max-w-56">{control.reason || 'Incident mitigation'}</span>
 </div>
 </div>
 )}

 <div className="pt-2 border-t border-border flex items-center justify-between">
 <span className="text-xs text-muted-foreground">
 Status: <span className={control.is_active ? 'text-destructive font-bold' : 'text-success font-medium'}>{control.is_active ? 'ENABLED (KILL SWITCH ON)' : 'OFF (NORMAL)'}</span>
 </span>

 {control.is_active ? (
 <Button
 size="sm"
 onClick={() => openConfirmationModal(control, false)}
 className="h-8 text-xs font-semibold bg-success hover:bg-success text-foreground rounded-xl"
 >
 <Unlock className="h-3.5 w-3.5 mr-1.5" />
 Restore Normal Flow
 </Button>
 ) : (
 <Button
 size="sm"
 variant="destructive"
 onClick={() => openConfirmationModal(control, true)}
 className="h-8 text-xs font-semibold bg-destructive hover:bg-destructive text-destructive-foreground rounded-xl"
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
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
 <div className={`p-5 border-b flex items-center justify-between ${targetState ? 'bg-destructive/10 border-destructive/30' : 'bg-success-surface border-success/30'}`}>
 <div className="flex items-center gap-2.5">
 <AlertOctagon className={`h-5 w-5 ${targetState ? 'text-destructive' : 'text-success'}`} />
 <h3 className="font-bold text-base text-foreground">
 {targetState ? 'Confirm Emergency Kill Switch' : 'Confirm Control Deactivation'}
 </h3>
 </div>
 <button
 onClick={closeConfirmationModal}
 className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 <div className="p-3.5 rounded-xl bg-card border border-border text-xs text-muted-foreground">
 <div className="font-semibold text-foreground mb-1">{activeModalControl.name}</div>
 <p className="text-muted-foreground">{activeModalControl.description}</p>
 </div>

 {targetState && (
 <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
 <div className="font-bold flex items-center gap-1.5">
 <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
 High Blast Radius Action
 </div>
 <p className="text-2xs text-destructive/90 leading-relaxed">
 This action affects all clients immediately. It will be saved in the activity history.
 </p>
 </div>
 )}

 <div>
 <label className="text-xs font-semibold text-muted-foreground block mb-1">
 Mandatory Operational Justification Reason <span className="text-destructive">*</span>
 </label>
 <textarea
 rows={3}
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 placeholder="E.g., Mitigating upstream SMS provider outage or patching webhook loop..."
 className="w-full text-xs bg-card border border-border rounded-xl p-3 text-foreground focus:outline-hidden focus:border-destructive/30 placeholder:text-muted-foreground"
 />
 </div>

 <div>
 <label className="text-xs font-semibold text-muted-foreground block mb-1">
 Type <span className="tabular-nums text-destructive font-bold">CONFIRM</span> to authenticate mutation:
 </label>
 <Input
 value={confirmInput}
 onChange={(e) => setConfirmInput(e.target.value)}
 placeholder="CONFIRM"
 className="h-9 text-xs bg-card border-border text-foreground tabular-nums focus:border-destructive/30 rounded-xl"
 />
 </div>

 <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
 <Button
 variant="outline"
 size="sm"
 onClick={closeConfirmationModal}
 className="h-9 text-xs border-border bg-card text-muted-foreground hover:bg-muted"
 >
 Cancel
 </Button>
 <Button
 size="sm"
 disabled={isProcessing || !reason.trim() || confirmInput.trim().toUpperCase() !== 'CONFIRM'}
 onClick={handleExecuteEmergencyAction}
 className={`h-9 text-xs font-bold ${
 targetState
 ? 'bg-destructive hover:bg-destructive text-foreground'
 : 'bg-success hover:bg-success text-destructive-foreground'
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

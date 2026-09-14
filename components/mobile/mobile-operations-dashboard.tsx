'use client'

// ==============================================================================
// InkFlow ERP - Mobile Operations Dashboard (V8)
// Mobile-First Operational Hub: Actionable Today's Work, Quick Actions & Live Summary
// ==============================================================================

import React, { useState, useEffect } from 'react'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Truck,
  DollarSign,
  Package,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { MobileTodaySummary, MobileTaskItem } from '../../types/mobile.types.ts'
import {
  getMobileDashboardSummaryAction,
  getMobileTasksAction,
  updateMobileTaskAction,
} from '../../actions/mobile.actions.ts'
import { SyncCenterModal } from './sync-center-modal.tsx'

interface MobileOperationsDashboardProps {
  tenantSlug: string
}

export function MobileOperationsDashboard({ tenantSlug }: MobileOperationsDashboardProps) {
  const [summary, setSummary] = useState<MobileTodaySummary | null>(null)
  const [tasks, setTasks] = useState<MobileTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncCenterOpen, setSyncCenterOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending')
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    fetchData()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [sumRes, tasksRes] = await Promise.all([
        getMobileDashboardSummaryAction(),
        getMobileTasksAction(),
      ])

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data)
      }
      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data)
      }
    } catch (err) {
      console.error('Failed to load mobile operations data', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleTaskAction(
    taskId: string,
    action: 'start' | 'pause' | 'resume' | 'hold' | 'complete' | 'rework'
  ) {
    setUpdatingTaskId(taskId)
    try {
      await updateMobileTaskAction(taskId, action)
      await fetchData()
    } catch (err) {
      console.error('Failed to update task', err)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'pending') return t.status === 'PENDING'
    if (activeTab === 'in_progress') return t.status === 'IN_PROGRESS' || t.status === 'PAUSED' || t.status === 'HOLD'
    if (activeTab === 'completed') return t.status === 'COMPLETED'
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 pt-4 px-3 sm:px-6 max-w-lg mx-auto">
      {/* 1. Header with Network Status and Sync Trigger */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            InkFlow Mobile
          </h1>
          <p className="text-xs text-slate-400">Today&apos;s Operational Hub</p>
        </div>

        <button
          onClick={() => setSyncCenterOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            isOnline
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-400 animate-pulse'
          }`}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </button>
      </div>

      {/* 2. Today's Actionable Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-indigo-400 mb-1">
              <ClipboardList className="w-4 h-4" />
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Tasks</span>
            </div>
            <div className="text-2xl font-black text-slate-100">{summary.pending_tasks_count}</div>
            <div className="text-3xs text-slate-400 mt-0.5">{summary.in_progress_tasks_count} in progress</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-cyan-400 mb-1">
              <Send className="w-4 h-4" />
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Designs</span>
            </div>
            <div className="text-2xl font-black text-slate-100">{summary.designs_awaiting_approval_count}</div>
            <div className="text-3xs text-slate-400 mt-0.5">Awaiting Client Proof</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Delivery</span>
            </div>
            <div className="text-2xl font-black text-slate-100">{summary.scheduled_deliveries_count}</div>
            <div className="text-3xs text-slate-400 mt-0.5">Dispatched / Pending</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Due BDT</span>
            </div>
            <div className="text-2xl font-black text-slate-100">{summary.total_due_amount.toLocaleString()}</div>
            <div className="text-3xs text-slate-400 mt-0.5">{summary.overdue_invoices_count} Overdue Invoices</div>
          </div>
        </div>
      )}

      {/* 3. Task Management Tabs */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Floor Tasks</h2>
          <button
            onClick={fetchData}
            className="text-xs text-indigo-400 flex items-center gap-1 hover:text-indigo-300 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'in_progress'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* 4. Task Cards List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
            No {activeTab.replace('_', ' ')} tasks for today.
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 shadow-sm hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <span className="text-2xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/50">
                    {t.job_order_number || 'TASK'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100 mt-1">{t.title}</h3>
                </div>

                <span
                  className={`text-3xs font-black uppercase px-2 py-0.5 rounded-full border ${
                    t.status === 'COMPLETED'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : t.status === 'IN_PROGRESS'
                      ? 'bg-cyan-950 text-cyan-400 border-cyan-800 animate-pulse'
                      : t.status === 'PAUSED'
                      ? 'bg-amber-950 text-amber-400 border-amber-800'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between mb-3">
                <span>Client: {t.customer_name || 'Commercial Print'}</span>
                {t.machine_name && <span className="text-slate-400">Machine: {t.machine_name}</span>}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                {t.status === 'PENDING' && (
                  <button
                    disabled={updatingTaskId === t.id}
                    onClick={() => handleTaskAction(t.id, 'start')}
                    className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-transform cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Job
                  </button>
                )}

                {t.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      disabled={updatingTaskId === t.id}
                      onClick={() => handleTaskAction(t.id, 'pause')}
                      className="flex-1 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                    <button
                      disabled={updatingTaskId === t.id}
                      onClick={() => handleTaskAction(t.id, 'complete')}
                      className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete
                    </button>
                  </>
                )}

                {t.status === 'PAUSED' && (
                  <button
                    disabled={updatingTaskId === t.id}
                    onClick={() => handleTaskAction(t.id, 'resume')}
                    className="flex-1 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Resume
                  </button>
                )}

                {t.status === 'COMPLETED' && (
                  <button
                    disabled={updatingTaskId === t.id}
                    onClick={() => handleTaskAction(t.id, 'rework')}
                    className="flex-1 min-h-[44px] bg-rose-900/60 hover:bg-rose-800 text-rose-300 border border-rose-700/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Report Rework
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sync Center Modal */}
      <SyncCenterModal open={syncCenterOpen} onClose={() => setSyncCenterOpen(false)} />
    </div>
  )
}

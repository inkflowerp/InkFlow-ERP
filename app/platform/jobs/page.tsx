'use client'

import React, { useState, useEffect } from 'react'
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Check,
  Terminal,
  X,
  Play,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPlatformBackgroundJobsAction } from '@/actions/platform-data.actions'
import { PlatformBackgroundJobItem } from '@/types/platform.types'
import { retryBackgroundJobAction } from '@/actions/platform.actions'
import { formatTime } from '@/lib/formatters'

export default function PlatformJobsPage() {
  const [jobs, setJobs] = useState<PlatformBackgroundJobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inspectJob, setInspectJob] = useState<PlatformBackgroundJobItem | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadJobs = async () => {
    setLoading(true)
    const res = await getPlatformBackgroundJobsAction()
    if (res.success && res.data) {
      setJobs(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const handleRetry = async (jobId: string) => {
    setIsRetrying(jobId)
    const res = await retryBackgroundJobAction(jobId)
    if (res.success) {
      showNotification(`Job ${jobId} triggered for safe re-execution.`)
      loadJobs()
    } else {
      showNotification('Failed to retry job.')
    }
    setIsRetrying(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Worker Telemetry &amp; Execution Queue
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Cpu className="h-7 w-7 text-indigo-400" />
            Background Jobs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Inspect asynchronous queue workers, temporary proof cache compactions, SMS batch digests, and safe retries.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadJobs}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Jobs Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-base text-white font-bold">
            Worker Execution Queue ({jobs.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            System tasks executing in the background workers cluster.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Job ID &amp; Type</th>
                <th className="py-3 px-4">Tenant Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Scheduled / Executed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {jobs.map((j) => {
                const isFailed = j.status === 'failed' || j.status === 'dead_letter'
                const isRetryingStatus = j.status === 'retrying'
                const isCompleted = j.status === 'completed'

                return (
                  <tr key={j.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-white text-xs">{j.job_type}</div>
                      <div className="text-[10px] text-slate-500">{j.id}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {j.company_name ? j.company_name : <span className="text-slate-500">Global Cluster</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isRetryingStatus
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : isFailed
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {j.attempts} / {j.max_attempts}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {j.duration_ms ? `${j.duration_ms} ms` : '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {formatTime(j.scheduled_for)}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectJob(j)}
                        className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Inspect
                      </Button>

                      {(isFailed || isRetryingStatus) && (
                        <Button
                          size="sm"
                          disabled={isRetrying === j.id}
                          onClick={() => handleRetry(j.id)}
                          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Inspect Modal */}
      {inspectJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm">
                Job Details: {inspectJob.id}
              </div>
              <button onClick={() => setInspectJob(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>Type: <strong className="text-white font-mono">{inspectJob.job_type}</strong></div>
                <div>Status: <strong className="text-white font-mono uppercase">{inspectJob.status}</strong></div>
                <div>Attempts: <strong className="text-white font-mono">{inspectJob.attempts} / {inspectJob.max_attempts}</strong></div>
                <div>Duration: <strong className="text-white font-mono">{inspectJob.duration_ms} ms</strong></div>
              </div>

              {inspectJob.error_log && (
                <div className="space-y-1">
                  <div className="font-bold text-red-400">Error Log Output:</div>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-red-300 overflow-x-auto whitespace-pre-wrap">
                    {inspectJob.error_log}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button size="sm" onClick={() => setInspectJob(null)} className="bg-indigo-600 text-white text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

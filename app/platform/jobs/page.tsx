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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Worker Telemetry &amp; Execution Queue
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Cpu className="h-7 w-7 text-indigo-400" />
            Background Jobs
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Inspect asynchronous queue workers, temporary proof cache compactions, SMS batch digests, and safe retries.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadJobs}
          className="border-border bg-foreground text-muted-foreground hover:bg-secondary text-xs h-9"
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
      <Card className="bg-foreground border-border overflow-hidden">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base text-white font-bold">
            Worker Execution Queue ({jobs.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            System tasks executing in the background workers cluster.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-foreground text-muted-foreground font-semibold uppercase text-2xs border-b border-border">
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
            <tbody className="divide-y divide-border text-foreground">
              {jobs.map((j) => {
                const isFailed = j.status === 'failed' || j.status === 'dead_letter'
                const isRetryingStatus = j.status === 'retrying'
                const isCompleted = j.status === 'completed'

                return (
                  <tr key={j.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="font-bold text-white text-xs">{j.job_type}</div>
                      <div className="text-2xs text-muted-foreground">{j.id}</div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      {j.company_name ? j.company_name : <span className="text-muted-foreground">Global Cluster</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-2xs font-bold border ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isRetryingStatus
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : isFailed
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-secondary text-muted-foreground border-border'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums">
                      {j.attempts} / {j.max_attempts}
                    </td>

                    <td className="py-3.5 px-4 tabular-nums text-muted-foreground">
                      {j.duration_ms ? `${j.duration_ms} ms` : '—'}
                    </td>

                    <td className="py-3.5 px-4 tabular-nums text-muted-foreground text-2xs">
                      {formatTime(j.scheduled_for)}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectJob(j)}
                        className="h-7 text-xs border-border text-muted-foreground hover:bg-secondary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground backdrop-blur-sm">
          <div className="w-full max-w-lg bg-foreground border border-border rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-bold text-white text-sm">
                Job Details: {inspectJob.id}
              </div>
              <button onClick={() => setInspectJob(null)} className="text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>Type: <strong className="text-white tabular-nums">{inspectJob.job_type}</strong></div>
                <div>Status: <strong className="text-white tabular-nums uppercase">{inspectJob.status}</strong></div>
                <div>Attempts: <strong className="text-white tabular-nums">{inspectJob.attempts} / {inspectJob.max_attempts}</strong></div>
                <div>Duration: <strong className="text-white tabular-nums">{inspectJob.duration_ms} ms</strong></div>
              </div>

              {inspectJob.error_log && (
                <div className="space-y-1">
                  <div className="font-bold text-red-400">Error Log Output:</div>
                  <pre className="p-3 rounded-xl bg-foreground border border-border tabular-nums text-2xs text-red-300 overflow-x-auto whitespace-pre-wrap">
                    {inspectJob.error_log}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
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

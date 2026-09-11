'use client'

import React, { useState } from 'react'
import {
  Printer,
  CheckCircle2,
  Play,
  Layers,
  Scissors,
  Save,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OperatorJob {
  id: string
  orderNo: string
  title: string
  media: string
  widthFt: number
  heightFt: number
  qty: number
  status: 'pending' | 'printing' | 'completed'
  finishingNotes: string
  materialLoggedSft: number
}

const INITIAL_OPERATOR_JOBS: OperatorJob[] = []

import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function OperatorPanelPage() {
  const { locale, tBilingual } = useI18n()
  const [jobs, setJobs] = useDataStore<OperatorJob[]>(STORAGE_KEYS.OPERATOR_JOBS, INITIAL_OPERATOR_JOBS)
  const [selectedJob, setSelectedJob] = useState<OperatorJob | null>(null)
  const [isLogMaterialOpen, setIsLogMaterialOpen] = useState(false)
  const [loggedSft, setLoggedSft] = useState<number>(0)
  const [wastageSft, setWastageSft] = useState<number>(0)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleStartPrint = (jobId: string) => {
    PrintERPDataStore.updateItem<OperatorJob>(STORAGE_KEYS.OPERATOR_JOBS, jobId, { status: 'printing' })
    showNotification(`Job started printing on machine.`)
  }

  const handleCompleteJob = (jobId: string) => {
    PrintERPDataStore.updateItem<OperatorJob>(STORAGE_KEYS.OPERATOR_JOBS, jobId, { status: 'completed' })
    showNotification(`Job completed & marked QC Pass! Handed over to finishing.`)
  }

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    PrintERPDataStore.updateItem<OperatorJob>(STORAGE_KEYS.OPERATOR_JOBS, selectedJob.id, {
      materialLoggedSft: loggedSft,
    })
    setIsLogMaterialOpen(false)
    showNotification(`Material usage logged: ${loggedSft} sft (+${wastageSft} sft wastage)`)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <PageHeader
        titleEn="My Printing Jobs & Floor Queue"
        titleBn="প্রেস অপারেটর জব কিউ"
        descriptionEn="Machine operator terminal: view assigned jobs, execute print runs, log material consumption, and sign off QC."
        descriptionBn="মেশিন চালক টার্মিনাল: বরাদ্দকৃত কাজ দেখুন, প্রিন্ট সম্পন্ন করুন, মিডিয়া অপচয় এন্ট্রি দিন এবং কিউসি স্বাক্ষর করুন।"
        icon={Printer}
        iconColor="text-blue-600"
        badge={
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 bangla-text">
            {tBilingual('Role: Print Operator', 'রোল: মেশিন অপারেটর')}
          </Badge>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Active Jobs Cards */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Card className="p-12 text-center space-y-3 border-dashed border-slate-200 dark:border-slate-800">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Printer className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 bangla-text">
              {tBilingual('No active printing jobs in queue', 'কোন সক্রিয় প্রিন্টিং জব নেই')}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto bangla-text">
              {tBilingual(
                'Jobs sent to production from the sales orders panel will appear here for machine operators to start printing.',
                'সেলস অর্ডার প্যানেল থেকে প্রডাকশনে পাঠানো নতুন কাজগুলো এখানে প্রদর্শিত হবে।'
              )}
            </p>
          </Card>
        ) : (
          jobs.map((job: OperatorJob) => {
          const totalAreaSft = job.widthFt * job.heightFt * job.qty
          return (
            <Card
              key={job.id}
              className={`border-l-4 transition-all ${
                job.status === 'printing'
                  ? 'border-l-blue-600 shadow-md bg-blue-50/20'
                  : job.status === 'completed'
                  ? 'border-l-emerald-600 opacity-80'
                  : 'border-l-slate-300 dark:border-l-slate-700'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Job Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                        {job.orderNo}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {job.title}
                      </h3>
                      {job.status === 'printing' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-blue-600" />
                          PRINTING LIVE
                        </span>
                      )}
                      {job.status === 'completed' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          QC Passed & Completed
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        Media: <strong className="text-slate-900 dark:text-white">{job.media}</strong>
                      </div>
                      <div>
                        Size: <strong className="text-slate-900 dark:text-white">{job.widthFt} ft × {job.heightFt} ft</strong> ({totalAreaSft} sft total)
                      </div>
                      <div>
                        Quantity: <strong className="text-slate-900 dark:text-white">{job.qty} pcs</strong>
                      </div>
                    </div>

                    {/* Finishing instruction */}
                    <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-2.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 flex items-start gap-2">
                      <Scissors className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        <strong>Finishing Instructions:</strong> {job.finishingNotes}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedJob(job)
                        setLoggedSft(job.materialLoggedSft || totalAreaSft)
                        setWastageSft(Math.round(totalAreaSft * 0.05))
                        setIsLogMaterialOpen(true)
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Layers className="h-4 w-4 mr-1.5" />
                      Log Material ({job.materialLoggedSft ? `${job.materialLoggedSft} sft` : 'Add'})
                    </Button>

                    {job.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartPrint(job.id)}
                        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto font-semibold"
                      >
                        <Play className="h-4 w-4 mr-1.5" />
                        Start Print
                      </Button>
                    )}

                    {job.status === 'printing' && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteJob(job.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto font-bold text-white shadow-md"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Complete & QC Pass
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>

      {/* MODAL: LOG MATERIAL USAGE */}
      <ModalDialog
        open={isLogMaterialOpen}
        onOpenChange={setIsLogMaterialOpen}
        title="Log Raw Material Consumption"
        description={`Record media rolls consumed for ${selectedJob?.orderNo} to keep inventory accurate.`}
      >
        <form onSubmit={handleSaveMaterial} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="loggedSft" required>
              Actual Media Consumed (Square Feet / বর্গফুট)
            </Label>
            <Input
              id="loggedSft"
              type="number"
              value={loggedSft}
              onChange={(e) => setLoggedSft(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wastageSft">
              Estimated Edge/Lead Wastage (Square Feet / অপচয়)
            </Label>
            <Input
              id="wastageSft"
              type="number"
              value={wastageSft}
              onChange={(e) => setWastageSft(Number(e.target.value))}
            />
            <span className="text-[11px] text-slate-500">
              Typically 5% margin for machine grip and roll alignment.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsLogMaterialOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-1.5" />
              Save Consumption
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

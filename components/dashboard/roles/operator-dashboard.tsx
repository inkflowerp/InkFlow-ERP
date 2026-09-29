'use client'

import React, { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Printer,
  CheckCircle2,
  Clock,
  Clock3,
  Play,
  Pause,
  AlertOctagon,
  AlertTriangle,
  Sparkles,
  Layers,
  Cpu,
  Flame,
  UserCheck,
  ShieldCheck,
  Scissors,
  Wrench,
  ExternalLink,
  RefreshCw,
  Search,
  Check,
  Building,
  Info,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TodaysWorkFeed } from '@/components/dashboard/todays-work-feed'
import { MyWorkforceHub } from '@/components/portal/my-workforce-hub'
import { ProductionTaskRecord } from '@/types/production.types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { useMyWorkforce } from '@/hooks/use-my-workforce'

interface OperatorDashboardProps {
  tasks: ProductionTaskRecord[]
  onRefresh: () => void
}

const COMMON_MACHINES = [
  { id: 'all', name: 'All Press Stations', nameBn: 'সকল মেশিন স্টেশন', type: 'all' },
  { id: 'mach_offset', name: 'Heidelberg Speedmaster XL 75', nameBn: 'হাইডেলবার্গ অফসেট প্রেস', type: 'offset' },
  { id: 'mach_digital', name: 'Konica Minolta AccurioPress C4080', nameBn: 'ডিজিটাল কালার প্রেস', type: 'digital' },
  { id: 'mach_uv', name: 'Roland TrueVIS VG3-640 Eco-Solvent', nameBn: 'রোল্যান্ড লার্জ ফরম্যাট ইকো-সলভেন্ট', type: 'wide_format' },
  { id: 'mach_cutter', name: 'Polar 115 High-Speed Paper Cutter', nameBn: 'পোলার ১১৫ অটো কাটার', type: 'finishing' },
  { id: 'mach_laser', name: 'GCC LaserPro Spirit CO2 Laser & Acrylic', nameBn: 'লেজার ও এক্রিলিক সিএনসি', type: 'fabrication' },
]

export function OperatorDashboard({ tasks, onRefresh }: OperatorDashboardProps) {
  const { tBilingual } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const { company, currentUser, currentBranch } = useTenant()

  const {
    employee,
    isClockedIn,
    isClockedOut,
    todayAttendance,
    clockIn,
    clockOut,
  } = useMyWorkforce()

  const [activeTab, setActiveTab] = useState<'queue' | 'workforce' | 'machinery' | 'perimeter'>('queue')
  const [selectedMachine, setSelectedMachine] = useState<string>('all')
  const [isPunching, setIsPunching] = useState(false)
  const [punchFeedback, setPunchFeedback] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    onRefresh()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  // 1-Tap Clock In/Out on Dashboard
  const handleQuickClockIn = async () => {
    setIsPunching(true)
    setPunchFeedback(null)
    const res = await clockIn()
    setIsPunching(false)
    if (res.success) {
      setPunchFeedback(tBilingual('Clocked In successfully!', 'হাজিরা সম্পন্ন হয়েছে!'))
    }
  }

  const handleQuickClockOut = async () => {
    setIsPunching(true)
    setPunchFeedback(null)
    const res = await clockOut()
    setIsPunching(false)
    if (res.success) {
      setPunchFeedback(tBilingual('Clocked Out successfully!', 'প্রস্থান সম্পন্ন হয়েছে!'))
    }
  }

  const safeTasks = Array.isArray(tasks) ? tasks : []
  const activeCount = safeTasks.filter((t) => t.status === 'in_progress').length
  const queuedCount = safeTasks.filter((t) => t.status === 'queued' || (t.status as any) === 'pending').length
  const completedTodayCount = safeTasks.filter((t) => t.status === 'completed').length

  const operatorName = currentUser?.profile?.full_name
    ? tBilingual(currentUser.profile.full_name, currentUser.profile.full_name_bn || currentUser.profile.full_name)
    : employee?.name || 'Print Operator'

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. SHOP FLOOR COCKPIT BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 p-5 sm:p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-xs font-semibold">
                <Printer className="h-3 w-3 mr-1" />
                {tBilingual('Shop Floor & Press Terminal', 'প্রেস ও ফ্লোর টার্মিনাল')}
              </Badge>
              {currentBranch && (
                <Badge variant="outline" className="text-white border-white/20 text-xs">
                  <Building className="h-3 w-3 mr-1" />
                  {currentBranch.name.split('(')[0].trim()}
                </Badge>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black bangla-text leading-tight">
              {tBilingual('Welcome,', 'স্বাগতম,')} {operatorName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {tBilingual(
                'Direct machine task queue, approved artwork download, floor consumption, and personal workforce portal.',
                'সরাসরি মেশিন টাস্ক কিউ, প্রিন্ট আর্টওয়ার্ক ডাউনলোড, কাঁচামাল খরচ এবং ব্যক্তিগত হাজিরা ও বেতন পোর্টাল।'
              )}
            </p>
          </div>

          {/* Quick Shift Punch Status */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 min-w-[240px] text-center md:text-right space-y-2 shrink-0">
            <div className="text-xs text-blue-200 flex items-center justify-center md:justify-end gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>{tBilingual('Duty Attendance', 'হাজিরা ও শিফট')}</span>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-1.5">
              {todayAttendance?.check_in_time ? (
                <Badge className="bg-emerald-500 text-white font-mono text-xs">
                  IN: {todayAttendance.check_in_time}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-300 border-amber-400/40 text-xs">
                  {tBilingual('Not Clocked In', 'হাজিরা দেওয়া হয়নি')}
                </Badge>
              )}
              {todayAttendance?.check_out_time && (
                <Badge className="bg-blue-600 text-white font-mono text-xs">
                  OUT: {todayAttendance.check_out_time}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-end gap-2 pt-1">
              {!isClockedIn ? (
                <Button
                  size="sm"
                  onClick={handleQuickClockIn}
                  disabled={isPunching}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-lg cursor-pointer"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  {isPunching ? '...' : tBilingual('1-Tap Punch In', 'হাজিরা দিন (ইন)')}
                </Button>
              ) : !isClockedOut ? (
                <Button
                  size="sm"
                  onClick={handleQuickClockOut}
                  disabled={isPunching}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 px-3 rounded-lg cursor-pointer"
                >
                  <Clock3 className="h-3.5 w-3.5 mr-1" />
                  {isPunching ? '...' : tBilingual('1-Tap Punch Out', 'প্রস্থান (আউট)')}
                </Button>
              ) : (
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Done Today
                </span>
              )}
            </div>

            {punchFeedback && (
              <p className="text-2xs text-cyan-300 font-medium">{punchFeedback}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. FLOOR QUICK ACTION SHORTCUTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(getTenantNavHref('/operator', pathname))}
          className="h-auto py-3 px-3.5 justify-start border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 cursor-pointer"
        >
          <Cpu className="h-5 w-5 text-blue-600 mr-2.5 shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{tBilingual('Full Screen Terminal', 'ফুল টার্মিনাল')}</div>
            <div className="text-2xs text-slate-500">{tBilingual('Touch station queue', 'টাচ কিউ')}</div>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push(getTenantNavHref('/production/floor-consumption', pathname))}
          className="h-auto py-3 px-3.5 justify-start border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 cursor-pointer"
        >
          <Flame className="h-5 w-5 text-amber-600 mr-2.5 shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{tBilingual('Floor Consumptions', 'কাঁচামাল খরচ')}</div>
            <div className="text-2xs text-slate-500">{tBilingual('Log media & wastage', 'মিডিয়া ও অপচয়')}</div>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push(getTenantNavHref('/production/machineries', pathname))}
          className="h-auto py-3 px-3.5 justify-start border-slate-200 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 cursor-pointer"
        >
          <Wrench className="h-5 w-5 text-purple-600 mr-2.5 shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{tBilingual('Machinery Fleet', 'মেশিন যন্ত্রপাতি')}</div>
            <div className="text-2xs text-slate-500">{tBilingual('Log breakdown & repair', 'মেরামত ও রক্ষণাবেক্ষণ')}</div>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => setActiveTab('workforce')}
          className="h-auto py-3 px-3.5 justify-start border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 cursor-pointer"
        >
          <UserCheck className="h-5 w-5 text-emerald-600 mr-2.5 shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{tBilingual('My Attendance & Salary', 'আমার বেতন ও হাজিরা')}</div>
            <div className="text-2xs text-slate-500">{tBilingual('Leaves, OT & payslips', 'ছুটি, ওটি ও স্লিপ')}</div>
          </div>
        </Button>
      </div>

      {/* 3. OPERATOR TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {tBilingual('Floor Production Queue', 'ফ্লোর প্রডাকশন কিউ')} ({safeTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workforce')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'workforce'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {tBilingual('My Attendance & Salary Portal', 'আমার হাজিরা ও বেতন পোর্টাল')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('machinery')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'machinery'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {tBilingual('Machine Stations & Fleet', 'মেশিন স্টেশন ও অবস্থা')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('perimeter')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'perimeter'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {tBilingual('Permissions & Restrictions', 'অনুমতি ও সীমাবদ্ধতা')}
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: PRODUCTION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-5">
          {/* Station Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                {tBilingual('Station Machine:', 'মেশিন স্টেশন:')}
              </span>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="h-8 text-xs px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-background text-foreground"
              >
                {COMMON_MACHINES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {tBilingual(m.name, m.nameBn)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200">
                {activeCount} {tBilingual('In Progress', 'চলমান')}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200">
                {queuedCount} {tBilingual('Queued', 'অপেক্ষারত')}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                {completedTodayCount} {tBilingual('Done Today', 'আজ সম্পন্ন')}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 cursor-pointer"
                title="Refresh queue"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Actionable Task Feed */}
          <TodaysWorkFeed tasks={tasks} onRefresh={onRefresh} />
        </div>
      )}

      {/* TAB 2: MY WORKFORCE HUB */}
      {activeTab === 'workforce' && (
        <div className="space-y-4">
          <MyWorkforceHub />
        </div>
      )}

      {/* TAB 3: MACHINE FLEET STATUS */}
      {activeTab === 'machinery' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMMON_MACHINES.filter((m) => m.id !== 'all').map((m) => (
            <Card key={m.id} className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize text-2xs font-bold">
                    {m.type.replace('_', ' ')}
                  </Badge>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online & Ready
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.nameBn}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Speed: Normal</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(getTenantNavHref('/production/machineries', pathname))}
                    className="text-xs h-7 px-2.5 cursor-pointer"
                  >
                    <Wrench className="h-3 w-3 mr-1" />
                    {tBilingual('Report Issue', 'ত্রুটি রিপোর্ট')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 4: PERMISSIONS & RESTRICTIONS */}
      {activeTab === 'perimeter' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>{tBilingual('Print Operator Security Perimeter & Role Matrix', 'প্রিন্ট অপারেটরের নিরাপত্তা ও অনুমোদনের পরিধি')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {tBilingual('Granted Operational Authorities', 'অনুমোদিত কাজের অধিকারসমূহ')}
                </span>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300 pl-5 list-disc">
                  <li>{tBilingual('View assigned floor tasks and press production jobs', 'নির্ধারিত প্রেস টাস্ক ও জব দেখা')}</li>
                  <li>{tBilingual('1-tap Start, Pause, Resume, and Complete production tasks', 'কাজ শুরু, বিরতি ও সম্পন্ন করা')}</li>
                  <li>{tBilingual('Download approved prepress artwork proofs to RIP stations', 'অনুমোদিত আর্টওয়ার্ক ডাউনলোড করা')}</li>
                  <li>{tBilingual('Log media usage, sheet count & roll consumption', 'কাঁচামাল খরচ ও অপচয় রেকর্ড করা')}</li>
                  <li>{tBilingual('Report machine breakdowns, jams, and rework incidents', 'মেশিন ত্রুটি ও রিওয়ার্ক রিপোর্ট করা')}</li>
                  <li>{tBilingual('View own attendance, punch in/out, overtime, leaves & salary slips', 'নিজের ব্যক্তিগত হাজিরা, ওভারটাইম, ছুটি ও পে-স্লিপ দেখা')}</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  {tBilingual('Strict Governance Restrictions & Limitations', 'কঠোর আর্থিক ও নিরাপত্তা সীমাবদ্ধতা')}
                </span>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300 pl-5 list-disc">
                  <li>{tBilingual('NO access to customer invoices, billing rates, or commercial prices', 'গ্রাহকের বিল, রেট ও আর্থিক হিসাব দেখার অনুমতি নেই')}</li>
                  <li>{tBilingual('NO access to payment collections, cash ledger, or company accounts', 'টাকা জমা ও ক্যাশবুক দেখার অনুমতি নেই')}</li>
                  <li>{tBilingual('NO access to profit margins or sales executive commissions', 'মুনাফা বা সেলস কমিশন দেখার অনুমতি নেই')}</li>
                  <li>{tBilingual('CANNOT delete customer orders or void supervisor work orders', 'অর্ডার বা কাজের নির্দেশ মোছার অনুমতি নেই')}</li>
                  <li>{tBilingual('CANNOT access company settings, bank setups, or manage users', 'প্রতিষ্ঠান সেটিংস বা টিম সদস্য পরিবর্তন নিষেধ')}</li>
                  <li>{tBilingual('CANNOT view other employees’ salaries or confidential HR files', 'অন্য কর্মীদের বেতন বা ব্যক্তিগত ফাইল দেখার অনুমতি নেই')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

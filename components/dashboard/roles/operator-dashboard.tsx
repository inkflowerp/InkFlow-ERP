'use client'

import React from 'react'
import {
  Printer,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  AlertOctagon,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { TodaysWorkFeed } from '@/components/dashboard/todays-work-feed'
import { ProductionTaskRecord } from '@/types/production.types'

interface OperatorDashboardProps {
  tasks: ProductionTaskRecord[]
  onRefresh: () => void
}

export function OperatorDashboard({ tasks, onRefresh }: OperatorDashboardProps) {
  const { tBilingual } = useI18n()

  const safeTasks = Array.isArray(tasks) ? tasks : []
  const activeCount = safeTasks.filter((t) => t.status === 'in_progress').length
  const completedTodayCount = safeTasks.filter((t) => t.status === 'completed').length

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* Operator Greeting Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl shadow-md flex items-center justify-between">
        <div className="space-y-0.5">
          <Badge className="bg-white/20 text-white border-none text-2xs font-semibold">
            {tBilingual('Operator Terminal', 'প্রেস ও ফ্লোর টার্মিনাল')}
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black">
            {tBilingual('My Work — Today’s Task List', 'আমার কাজ — আজকের কাজের তালিকা')}
          </h1>
          <p className="text-xs text-blue-100/90">
            {tBilingual('Touch Start to begin, Report Issue if jammed, and Complete when done.', 'কাজ শুরু করতে "শুরু" চাপুন, সমস্যা হলে রিপোর্ট করুন এবং কাজ শেষে "সম্পন্ন" চাপুন।')}
          </p>
        </div>

        <div className="text-right hidden sm:block">
          <div className="text-2xl font-black font-mono">{activeCount}</div>
          <div className="text-2xs text-blue-200">
            {tBilingual('Currently Active', 'বর্তমানে চলমান')}
          </div>
        </div>
      </div>

      {/* Main Actionable Feed */}
      <TodaysWorkFeed tasks={tasks} onRefresh={onRefresh} />
    </div>
  )
}

'use client'

import React from 'react'
import {
  UserCheck,
  Briefcase,
  CheckCircle,
  Activity,
  ArrowRight,
  Shield,
  Clock,
  Building,
  GitBranch,
  ListTodo,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function EmployeeManagementSection() {
  const { tBilingual } = useI18n()

  const FLOW_STAGES = [
    { labelEn: 'Assign', labelBn: 'বরাদ্দ', icon: UserCheck },
    { labelEn: 'Work', labelBn: 'কাজ', icon: Briefcase },
    { labelEn: 'Complete', labelBn: 'সম্পন্ন', icon: CheckCircle },
    { labelEn: 'Track', labelBn: 'ট্র্যাক', icon: Activity },
  ]

  const TAGS = [
    { labelEn: 'Tasks', labelBn: 'টাস্ক', icon: ListTodo },
    { labelEn: 'Responsibilities', labelBn: 'দায়িত্ব', icon: Shield },
    { labelEn: 'Attendance', labelBn: 'হাজিরা', icon: Clock },
    { labelEn: 'Permissions', labelBn: 'পারমিশন', icon: Shield },
    { labelEn: 'Departments', labelBn: 'বিভাগ', icon: Building },
    { labelEn: 'Branches', labelBn: 'ব্রাঞ্চ', icon: GitBranch },
  ]

  return (
    <section className="py-14 sm:py-18 bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>{tBilingual('Employee Management', 'কর্মী ব্যবস্থাপনা')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Everyone Knows What To Do.', 'সবাই জানে কী করতে হবে।')}
          </h2>
        </div>

        {/* 4 Connected Stages: Assign -> Work -> Complete -> Track */}
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FLOW_STAGES.map((stg, idx) => {
            const Icon = stg.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-xs hover:border-primary/40 transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground tabular-nums block">
                    0{idx + 1}
                  </span>
                  <span className="text-sm font-bold text-foreground block mt-0.5">
                    {tBilingual(stg.labelEn, stg.labelBn)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Small supporting labels / pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto pt-2">
          {TAGS.map((tag, idx) => {
            const Icon = tag.icon
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-card text-xs font-medium text-foreground shadow-2xs"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span>{tBilingual(tag.labelEn, tag.labelBn)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

'use client'

import React, { useState } from 'react'
import {
  UserCheck,
  Briefcase,
  CheckCircle,
  Activity,
  Shield,
  Clock,
  Building,
  GitBranch,
  ListTodo,
  QrCode,
  Users,
  ShieldCheck,
  Smartphone,
  Banknote,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export function EmployeeManagementSection() {
  const { tBilingual } = useI18n()
  const [isSimulatedScan, setIsSimulatedScan] = useState(false)

  const STAFF_ROSTER = [
    {
      nameEn: 'Md. Faruk Hossain',
      nameBn: 'মোঃ ফারুক হোসেন',
      roleEn: 'Lead Press Operator',
      roleBn: 'প্রধান প্রেস অপারেটর',
      stationEn: 'Flora Polaris 512i Machine',
      stationBn: 'ফ্লোরা পোলারিস ৫১২আই',
      status: 'on_duty',
      timeIn: '09:02 AM',
      sftToday: '420 SFT Printed',
      sftTodayBn: '৪২০ স্কয়ারফুট প্রিন্ট',
    },
    {
      nameEn: 'Rakib Ahmed',
      nameBn: 'রাকিব আহমেদ',
      roleEn: 'Prepress Graphic Designer',
      roleBn: 'প্রি-প্রেস গ্রাফিক ডিজাইনার',
      stationEn: 'Mac Studio Prepress Bed',
      stationBn: 'ম্যাক স্টুডিও প্রি-প্রেস ডেস্ক',
      status: 'on_duty',
      timeIn: '09:14 AM',
      sftToday: '9 Client Proofs Cleared',
      sftTodayBn: '৯টি ক্লায়েন্ট প্রুফ পাস',
    },
    {
      nameEn: 'Sajib Mia',
      nameBn: 'সজিব মিয়া',
      roleEn: 'Finishing & Site Fitter',
      roleBn: 'ফিনিশিং ও সাইট ফিটার',
      stationEn: 'Eyelet & Frame Bed / Field',
      stationBn: 'আইলেট ও মেটাল ফ্রেম / সাইট',
      status: 'field',
      timeIn: '09:30 AM',
      sftToday: 'DC-2026-088 Installed',
      sftTodayBn: 'ডেলিভারি চালান সাইট ফিটিং',
    },
  ]

  const ROLE_PERMISSIONS = [
    {
      roleEn: 'Press Operators',
      roleBn: 'মেশিন অপারেটর',
      accessEn: 'Assigned print queues and SFT counters only. Profit margins and client phones hidden.',
      accessBn: 'মেশিনের কিউ ও SFT কাউন্টার দেখতে পান। লাভ ও ক্লায়েন্টের ফোন গোপন থাকে।',
    },
    {
      roleEn: 'Prepress Designers',
      roleBn: 'ডিজাইনার ও প্রুফার',
      accessEn: 'Artwork proofs and color profiles only. Cash book and supplier rates hidden.',
      accessBn: 'শুধুমাত্র প্রুফ ও আর্টওয়ার্ক। ক্যাশ বুক বা সাপ্লায়ার দর সম্পূর্ণ গোপন।',
    },
    {
      roleEn: 'Shop Owner & Accounts',
      roleBn: 'মালিক ও একাউন্টস',
      accessEn: 'Full ledger, bKash balances, supplier payables, net profit, and audit logs.',
      accessBn: 'ক্যাশ, ব্যাংক, বিকাশ, সাপ্লায়ার বাকি ও নিট লাভের পূর্ণ নিয়ন্ত্রণ।',
    },
  ]

  return (
    <section id="employees" className="py-14 sm:py-20 bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <QrCode className="h-3.5 w-3.5" />
            <span>{tBilingual('QR Attendance & Staff', 'কিউআর হাজিরা ও কর্মী')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'Smart QR Attendance & Role Permissions.',
              'স্মার্ট কিউআর হাজিরা ও নিরাপদ পারমিশন।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              'Staff scan personal QR badges on phones or tablets. Strict permissions keep your margins private.',
              'মোবাইল বা ট্যাবলেটে দ্রুত কিউআর হাজিরা। কঠোর পারমিশনে মালিকের লাভ থাকে সম্পূর্ণ গোপন।'
            )}
          </p>
        </div>

        {/* Live QR Attendance Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl mx-auto items-start">
          {/* Left: Interactive QR Terminal Simulator (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Floor Terminal Scanner
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Tablet Front Camera / Android Mobile
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success-surface text-success border border-success-border">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span>Live Ready</span>
              </span>
            </div>

            {/* Simulated Badge Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-3">
              <div className="inline-block p-3 rounded-xl bg-card border border-border shadow-2xs">
                <div className="h-24 w-24 mx-auto flex items-center justify-center border-2 border-dashed border-primary/40 rounded-lg bg-primary/5">
                  <QrCode className="h-16 w-16 text-primary" />
                </div>
              </div>

              <div>
                <span className="text-xs font-mono font-bold text-primary block">
                  BADGE #EMP-104
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Md. Faruk Hossain
                </h4>
                <p className="text-xs text-muted-foreground">
                  Flora Polaris Lead Press Operator
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsSimulatedScan(!isSimulatedScan)}
                className="w-full h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
              >
                <QrCode className="mr-1.5 h-3.5 w-3.5" />
                <span>
                  {isSimulatedScan
                    ? tBilingual('Reset Scan Demo', 'পুনরায় দেখুন')
                    : tBilingual('Simulate Badge Scan', 'হাজিরা স্ক্যান পরীক্ষা করুন')}
                </span>
              </Button>
            </div>

            {/* Scan Result Notice */}
            <div
              className={`p-3 rounded-lg border text-xs transition-all ${
                isSimulatedScan
                  ? 'bg-success-surface border-success-border text-success'
                  : 'bg-muted/40 border-border text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span>
                  {isSimulatedScan
                    ? 'Scan Verified: Check-in 09:02 AM'
                    : 'Awaiting Operator QR Badge'}
                </span>
                <span className="font-mono">
                  {isSimulatedScan ? 'ON-TIME (SHIFT A)' : 'GEOFENCE ACTIVE'}
                </span>
              </div>
              <p className="mt-1 text-xs opacity-90">
                {isSimulatedScan
                  ? 'Shop floor GPS & WiFi match. SFT operator commission counter activated.'
                  : 'Daily rotating QR prevents screenshots or buddy-punching offsite.'}
              </p>
            </div>
          </div>

          {/* Right: Live Floor Roster & Payroll Features (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Live On-Duty Staff Table Mockup */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {tBilingual('Live On-Duty Shop Floor Roster', 'কারখানা ফ্লোরে উপস্থিত কর্মীদের তালিকা')}
                  </h3>
                </div>
                <span className="text-xs font-bold text-success font-mono">
                  3 Active On-Duty
                </span>
              </div>

              <div className="space-y-2">
                {STAFF_ROSTER.map((staff, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {tBilingual(staff.nameEn, staff.nameBn)}
                        </span>
                        <span className="text-xs px-2 py-0.2 rounded-full font-semibold bg-success-surface text-success border border-success-border">
                          {staff.status === 'on_duty' ? 'On-Duty' : 'Site Field'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {tBilingual(staff.roleEn, staff.roleBn)} • {staff.stationEn}
                      </span>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="font-mono font-bold text-foreground block">
                        In: {staff.timeIn}
                      </span>
                      <span className="text-xs text-primary font-medium block">
                        {tBilingual(staff.sftToday, staff.sftTodayBn)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 Role-Based Permission Chips */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {tBilingual('Role-Based Privacy & Workstations', 'ভূমিকাভিত্তিক পারমিশন ও আর্থিক সুরক্ষা')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {ROLE_PERMISSIONS.map((perm, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <span className="font-bold text-foreground block">
                      {tBilingual(perm.roleEn, perm.roleBn)}
                    </span>
                    <p className="text-xs text-muted-foreground leading-normal">
                      {tBilingual(perm.accessEn, perm.accessBn)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Supporting Features: Salary, Advances, Overtime, Branches */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-5xl mx-auto pt-2">
          <div className="p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Banknote className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                {tBilingual('Salary & Advances', 'বেতন ও অগ্রিম খাতা')}
              </span>
              <span className="text-xs text-muted-foreground block truncate">
                {tBilingual('Track mid-month advances', 'অগ্রিম নেওয়ার নিখুঁত হিসাব')}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                {tBilingual('Overtime Calculation', 'ওভারটাইম ঘণ্টা হিসাব')}
              </span>
              <span className="text-xs text-muted-foreground block truncate">
                {tBilingual('Automated late & extra hours', 'স্বয়ংক্রিয় অতিরিক্ত সময়')}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                {tBilingual('Per-SFT Commission', 'স্কয়ারফিট বোনাস')}
              </span>
              <span className="text-xs text-muted-foreground block truncate">
                {tBilingual('Operator output incentives', 'অপারেটর উৎপাদন ইনসেন্টিভ')}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                {tBilingual('Multi-Branch Roster', 'একাধিক শাখা ব্যবস্থাপনা')}
              </span>
              <span className="text-xs text-muted-foreground block truncate">
                {tBilingual('Assign to Dhaka, Bogura etc.', 'ঢাকা বা বিভাগীয় শাখা')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

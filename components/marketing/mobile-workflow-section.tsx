'use client'

import React from 'react'
import {
  Smartphone,
  ShoppingCart,
  Printer,
  Boxes,
  Users,
  Truck,
  CreditCard,
  CheckCircle2,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function MobileWorkflowSection() {
  const { tBilingual } = useI18n()

  const LABELS = [
    { nameEn: 'Orders', nameBn: 'অর্ডার', icon: ShoppingCart },
    { nameEn: 'Production', nameBn: 'প্রোডাকশন', icon: Printer },
    { nameEn: 'Inventory', nameBn: 'ইনভেন্টরি', icon: Boxes },
    { nameEn: 'Employees', nameBn: 'কর্মী', icon: Users },
    { nameEn: 'Delivery', nameBn: 'ডেলিভারি', icon: Truck },
    { nameEn: 'Payments', nameBn: 'পেমেন্ট', icon: CreditCard },
  ]

  return (
    <section className="py-14 sm:py-20 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>{tBilingual('Mobile Responsive Web', 'মোবাইল রেসপনসিভ')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Your Business. Anywhere.', 'আপনার ব্যবসা যেখানেই থাকুন।')}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {tBilingual(
              'Fully responsive in any mobile browser with zero app installation required.',
              'যেকোনো মোবাইল ব্রাউজারে অ্যাপ ইনস্টল ছাড়াই স্বচ্ছন্দে ব্যবহারযোগ্য।'
            )}
          </p>
        </div>

        {/* 6 Clean Action Modules Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {LABELS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                  {tBilingual(item.nameEn, item.nameBn)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Realistic Mobile View Card */}
        <div className="max-w-xs mx-auto rounded-2xl border-2 border-border bg-card p-3 shadow-md">
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground font-mono">PrintFlow Mobile</span>
              <span className="text-xs text-success font-medium">● Live Web</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-card border border-border flex items-center justify-between">
                <span className="font-semibold text-foreground">Active Orders</span>
                <span className="font-bold text-primary">12 Running</span>
              </div>
              <div className="p-2 rounded bg-card border border-border flex items-center justify-between">
                <span className="font-semibold text-foreground">Machine Floor</span>
                <span className="font-bold text-success">3 In Queue</span>
              </div>
              <div className="p-2 rounded bg-card border border-border flex items-center justify-between">
                <span className="font-semibold text-foreground">Collected Today</span>
                <span className="font-bold text-foreground">৳ 48,500</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

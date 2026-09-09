'use client'

import React, { useState } from 'react'
import {
  Printer,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Shield,
  Layers,
  Wrench,
  Truck,
  MessageSquare,
  Eye,
  FileText,
  User,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

export function DashboardMockup() {
  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'orders'>('overview')
  const { tBilingual } = useI18n()

  const RECENT_ORDERS = [
    {
      id: 'ORD-00284',
      client: 'Akij Food & Beverage Ltd',
      clientBn: 'আকিজ ফুড অ্যান্ড বেভারেজ',
      product: 'Highway Billboard (20ft × 10ft)',
      media: 'Star Flex 380 GSM',
      sft: '200 SFT',
      amount: '৳ 18,500',
      advance: '৳ 10,000',
      due: '৳ 8,500',
      status: 'Printing',
      statusBn: 'প্রিন্ট চলছে',
      statusColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      machine: 'Flora Solvent 10ft',
      operator: 'Rahim (Operator #1)',
    },
    {
      id: 'ORD-00285',
      client: 'Beximco Pharma Expo',
      clientBn: 'বেক্সিমকো ফার্মা এক্সপো',
      product: 'Rollup Standees (3 Pcs)',
      media: 'Cast Vinyl + Matte Lam',
      sft: '45 SFT',
      amount: '৳ 6,800',
      advance: '৳ 6,800',
      due: '৳ 0 (Paid)',
      status: 'Finishing',
      statusBn: 'লেমিনেশন ও কাটিং',
      statusColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      machine: 'Cold Laminator 5ft',
      operator: 'Faruk (Finishing)',
    },
    {
      id: 'ORD-00286',
      client: 'Walton Plaza Motijheel',
      clientBn: 'ওয়ালটন প্লাজা মতিঝিল',
      product: '3D Acrylic Channel Letters',
      media: '3mm Red Acrylic + LED',
      sft: '32 RFT',
      amount: '৳ 64,000',
      advance: '৳ 35,000',
      due: '৳ 29,000',
      status: 'Fabrication',
      statusBn: 'ফ্যাব্রিকেশন',
      statusColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
      machine: 'CNC Laser 1325 + Bending',
      operator: 'Sohel (Sign Tech)',
    },
    {
      id: 'ORD-00287',
      client: 'Shwapno Super Shop',
      clientBn: 'স্বপ্ন সুপার শপ',
      product: 'Promotional Danglers (1,500 pcs)',
      media: '300 GSM Art Card + Die',
      sft: '125 SFT',
      amount: '৳ 14,200',
      advance: '৳ 10,000',
      due: '৳ 4,200',
      status: 'Ready',
      statusBn: 'ডেলিভারি রেডি',
      statusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      machine: 'Heidelberg SM52-4',
      operator: 'Alamgir (Press Lead)',
    },
    {
      id: 'ORD-00288',
      client: 'Pran-RFL Group Retail',
      clientBn: 'প্রাণ-আরএফএল গ্রুপ',
      product: 'Panaflex Lightbox (8ft × 4ft)',
      media: 'Chinese Backlit 510 GSM',
      sft: '32 SFT',
      amount: '৳ 12,800',
      advance: '৳ 8,000',
      due: '৳ 4,800',
      status: 'Pre-Press',
      statusBn: 'ডিজাইন প্রুফিং',
      statusColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      machine: 'RIP Workstation #2',
      operator: 'Tanvir (Designer)',
    },
  ]

  const KANBAN_STAGES = [
    {
      id: 'design',
      title: 'Pre-Press Proof',
      titleBn: 'প্রি-প্রেস প্রুফ',
      color: 'border-blue-500/30 bg-blue-950/20 text-blue-400',
      count: 3,
      jobs: [
        { id: 'ORD-288', client: 'Pran-RFL Group', item: 'Backlit Panaflex 8x4ft', tag: 'Proof Sent' },
        { id: 'ORD-289', client: 'ACI Consumer', item: 'Sticker Decals 500 pcs', tag: 'Awaiting Sign' },
        { id: 'ORD-290', client: 'Square Toiletries', item: 'Retail Box Packaging', tag: 'Die-line Ready' },
      ],
    },
    {
      id: 'printing',
      title: 'Press & Solvent',
      titleBn: 'মেশিনে রানিং',
      color: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400',
      count: 6,
      jobs: [
        { id: 'ORD-284', client: 'Akij Beverage', item: '20ft × 10ft Star Flex', tag: 'Flora 10ft (80%)' },
        { id: 'ORD-291', client: 'Meena Bazar', item: 'P10 Banner 12ft × 3ft', tag: 'Konica 512i' },
        { id: 'ORD-292', client: 'Bashundhara Food', item: 'Backlit Film 6 Pcs', tag: 'Roland Eco-Sol' },
      ],
    },
    {
      id: 'finishing',
      title: 'Finishing & Cut',
      titleBn: 'লেমিনেশন ও কাটিং',
      color: 'border-fuchsia-500/30 bg-fuchsia-950/20 text-fuchsia-400',
      count: 4,
      jobs: [
        { id: 'ORD-285', client: 'Beximco Expo', item: '3 Pcs Rollup Standees', tag: 'Matte Lamination' },
        { id: 'ORD-293', client: 'Grameenphone', item: 'Promo Posters 200 pcs', tag: 'Grommet Eyelets' },
      ],
    },
    {
      id: 'fabrication',
      title: 'CNC & Acrylic',
      titleBn: 'ফ্যাব্রিকেশন ও ফ্রেম',
      color: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
      count: 2,
      jobs: [
        { id: 'ORD-286', client: 'Walton Plaza', item: '3D Acrylic Letters', tag: 'LED Wiring & ACP' },
        { id: 'ORD-294', client: 'Apex Footwear', item: 'Golden SS Shop Fascia', tag: 'Welding Frame' },
      ],
    },
    {
      id: 'delivery',
      title: 'Challan & Dispatch',
      titleBn: 'ডেলিভারি চালান',
      color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
      count: 5,
      jobs: [
        { id: 'ORD-287', client: 'Shwapno Super', item: 'Danglers 1500 pcs', tag: 'Challan #CH-1092' },
        { id: 'ORD-295', client: 'Lotto Bangladesh', item: 'Shop Banner 10x4ft', tag: 'Out with Pickup' },
      ],
    },
  ]

  return (
    <div className="relative w-full rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl overflow-hidden">
      {/* Window Title Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-500/80 inline-block" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
            <span className="text-emerald-400">https://</span>
            <span className="text-slate-200">app.inkflow.com.bd</span>
            <span className="text-slate-500">/inkflow/{activeTab}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE FLOOR SYNC
          </span>
          <span className="text-slate-400 text-[11px] font-mono hidden md:inline">
            InkFlow ERP Cloud
          </span>
        </div>
      </div>

      {/* Internal Mockup Dashboard Shell */}
      <div className="p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-5 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 text-slate-100">
        {/* Top Mini Bar / Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-cyan-500/20 shrink-0">
              A
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="truncate">Apex Digital Press & Signage</span>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] border-cyan-500/40 text-cyan-300 py-0 h-4 shrink-0">
                  Business Tier
                </Badge>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Arambagh Press Cluster, Motijheel, Dhaka
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] sm:text-xs overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all text-center whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('production')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all text-center whitespace-nowrap cursor-pointer ${
                activeTab === 'production'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Floor Kanban
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all text-center whitespace-nowrap cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Recent Orders
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in-0 duration-200">
            {/* 5 KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              {/* 1: Today's Sales */}
              <div className="p-2.5 sm:p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs">
                  <span className="truncate">{tBilingual("Today's Sales", 'আজকের সেলস')}</span>
                  <DollarSign className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2">
                  <div className="text-base sm:text-xl font-black text-white tabular-nums tracking-tight">
                    ৳ 48,500
                  </div>
                  <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-400 font-medium mt-0.5">
                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">+18.4% vs yesterday</span>
                  </div>
                </div>
              </div>

              {/* 2: Pending Orders */}
              <div className="p-2.5 sm:p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs">
                  <span className="truncate">{tBilingual('Pending Orders', 'চলতি অর্ডার')}</span>
                  <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2">
                  <div className="text-base sm:text-xl font-black text-white tabular-nums tracking-tight">
                    14 Active
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">
                    4 design • 6 press • 4 finish
                  </div>
                </div>
              </div>

              {/* 3: Production Queue */}
              <div className="p-2.5 sm:p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs">
                  <span className="truncate">{tBilingual('Production Queue', 'মেশিন লাইন')}</span>
                  <Printer className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2">
                  <div className="text-base sm:text-xl font-black text-white tabular-nums tracking-tight">
                    8 On Press
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-fuchsia-400 mt-0.5 font-medium truncate">
                    Flora, Roland, Heidelberg
                  </div>
                </div>
              </div>

              {/* 4: Total Customer Due */}
              <div className="p-2.5 sm:p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs">
                  <span className="truncate">{tBilingual('Customer Due', 'মোট বকেয়া')}</span>
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2">
                  <div className="text-base sm:text-xl font-black text-amber-300 tabular-nums tracking-tight">
                    ৳ 1,24,000
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-amber-400/80 mt-0.5 truncate">
                    8 client accounts overdue
                  </div>
                </div>
              </div>

              {/* 5: Low Stock Warning */}
              <div className="col-span-2 lg:col-span-1 p-2.5 sm:p-3 rounded-xl border border-red-900/40 bg-red-950/20 flex flex-col justify-between">
                <div className="flex items-center justify-between text-red-300 text-[11px] sm:text-xs">
                  <span className="truncate">{tBilingual('Low Media Stock', 'স্টক ঘাটতি')}</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 animate-pulse shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2">
                  <div className="text-xs font-bold text-red-200 truncate">
                    Star Flex 10ft (380g)
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-red-400 mt-0.5 font-medium truncate">
                    Only 2 rolls left (Re-order now)
                  </div>
                </div>
              </div>
            </div>

            {/* Mid Section: Production Queue Visual & Real Orders Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Production Department Status Breakdown (Left 1 Col) */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <span>Live Factory Floor</span>
                  <span className="text-[10px] text-cyan-400">4 Depts Active</span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300 text-[11px] sm:text-xs">
                        <Layers className="h-3 w-3 text-blue-400 shrink-0" /> Pre-Press & Proofing
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-[11px]">3 Files</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-3/5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300 text-[11px] sm:text-xs">
                        <Printer className="h-3 w-3 text-cyan-400 shrink-0" /> Wide & Solvent Print
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-[11px]">6 Running</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full w-4/5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300 text-[11px] sm:text-xs">
                        <Wrench className="h-3 w-3 text-fuchsia-400 shrink-0" /> Acrylic & CNC Fab
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-[11px]">4 In Craft</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-fuchsia-500 rounded-full w-2/5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300 text-[11px] sm:text-xs">
                        <Truck className="h-3 w-3 text-emerald-400 shrink-0" /> Challan & Install
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-[11px]">2 Dispatched</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-full" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setActiveTab('production')}
                    className="w-full p-2 sm:p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-900/50 flex items-center justify-between text-xs gap-2 text-cyan-300 hover:bg-cyan-900/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-semibold truncate">Open Full Kanban Board</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Recent Orders Table (Right 2 Cols) */}
              <div className="lg:col-span-2 p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Recent Commercial Orders
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-cyan-400 font-mono">
                      Today: 18 Bookings
                    </span>
                  </div>

                  <div className="space-y-2">
                    {RECENT_ORDERS.slice(0, 4).map((ord) => (
                      <div
                        key={ord.id}
                        className="flex flex-col xs:flex-row xs:items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs gap-1.5 xs:gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="font-mono font-bold text-cyan-400 text-[10px] sm:text-[11px] shrink-0">
                            {ord.id}
                          </div>
                          <div className="min-w-0 truncate">
                            <div className="font-semibold text-slate-100 truncate text-[11px] sm:text-xs">
                              {tBilingual(ord.client, ord.clientBn)}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                              {ord.product} • {ord.media}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between xs:justify-end gap-2 shrink-0 pt-1 xs:pt-0 border-t xs:border-t-0 border-slate-800/50 xs:ml-2">
                          <span className="font-black text-slate-200 tabular-nums text-[11px] sm:text-xs">
                            {ord.amount}
                          </span>
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${ord.statusColor} bangla-text shrink-0`}
                          >
                            {tBilingual(ord.status, ord.statusBn)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
                  <span>Showing 4 of 18 jobs</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    View All Orders & Dues <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FLOOR KANBAN */}
        {activeTab === 'production' && (
          <div className="space-y-3 animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between text-xs pb-1">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-white text-xs sm:text-sm">Interactive Production Floor Kanban</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-cyan-400 font-mono">
                5 Departments • 20 Machine Runs
              </span>
            </div>

            {/* 5 Column Board */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
              {KANBAN_STAGES.map((col) => (
                <div
                  key={col.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 sm:p-3 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                    <span className="font-bold text-white text-[11px] sm:text-xs bangla-text">
                      {tBilingual(col.title, col.titleBn)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${col.color}`}>
                      {col.count}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {col.jobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold text-cyan-400">{job.id}</span>
                          <span className="text-slate-400 text-[9px]">{job.tag}</span>
                        </div>
                        <div className="font-semibold text-slate-200 text-[11px] truncate">
                          {job.client}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {job.item}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-slate-800/60 text-center">
                    <span className="text-[9px] text-slate-500 font-mono uppercase">
                      Live Queue Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RECENT ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-3 animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between text-xs pb-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-white text-xs sm:text-sm">Commercial Orders & Billing Ledger</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono">
                Auto SFT & WhatsApp Sync
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Order ID</th>
                    <th className="p-2.5">Customer</th>
                    <th className="p-2.5">Specification & SFT</th>
                    <th className="p-2.5">Machine / Dept</th>
                    <th className="p-2.5 text-right">Bill Total</th>
                    <th className="p-2.5 text-right">Balance Due</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {RECENT_ORDERS.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-cyan-400">{ord.id}</td>
                      <td className="p-2.5 font-semibold text-white bangla-text">
                        {tBilingual(ord.client, ord.clientBn)}
                      </td>
                      <td className="p-2.5 text-slate-300">
                        <div>{ord.product}</div>
                        <span className="text-[10px] text-cyan-400 font-mono">{ord.sft} • {ord.media}</span>
                      </td>
                      <td className="p-2.5 text-slate-400 text-[10px] font-mono">{ord.machine}</td>
                      <td className="p-2.5 text-right font-black text-white tabular-nums">{ord.amount}</td>
                      <td className="p-2.5 text-right font-bold text-amber-400 tabular-nums">{ord.due}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${ord.statusColor} bangla-text inline-block`}>
                          {tBilingual(ord.status, ord.statusBn)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

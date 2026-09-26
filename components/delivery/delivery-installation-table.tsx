'use client'

import React from 'react'
import {
  Wrench,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  Calendar,
  Layers,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InstallationRecord, InstallationStatus } from '@/types/logistics.types'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export interface DeliveryInstallationTableProps {
  installations: InstallationRecord[]
  onUpdateStatus?: (installationId: string, status: InstallationStatus) => void
}

export function DeliveryInstallationTable({
  installations,
  onUpdateStatus,
}: DeliveryInstallationTableProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const getInstallationStatusBadge = (status: InstallationStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>{isBn ? 'সম্পন্ন ও হস্তান্তরিত' : 'Completed & Signed'}</span>
          </Badge>
        )
      case 'on_site':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 font-bold gap-1 animate-pulse">
            <Wrench className="h-3 w-3 text-purple-600" />
            <span>{isBn ? 'সাইটে ফিটিং চলছে' : 'On Site Fitting'}</span>
          </Badge>
        )
      case 'scheduled':
      default:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            <Clock className="h-3 w-3 text-blue-500" />
            <span>{isBn ? 'ক্রু শিডিউলকৃত' : 'Crew Scheduled'}</span>
          </Badge>
        )
    }
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">{isBn ? 'ইনস্টলেশন নং' : 'Installation #'}</th>
              <th className="py-3 px-4">{isBn ? 'কাস্টমার ও সাইটের ঠিকানা' : 'Customer & Site Location'}</th>
              <th className="py-3 px-4">{isBn ? 'টিম লিড ও রিগিং ক্রু' : 'Crew Lead & Riggers'}</th>
              <th className="py-3 px-4">{isBn ? 'তারিখ ও সময়' : 'Scheduled Window'}</th>
              <th className="py-3 px-4">{isBn ? 'সরঞ্জাম' : 'Equipment'}</th>
              <th className="py-3 px-4">{isBn ? 'অবস্থা' : 'Status'}</th>
              <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {installations.map((ins) => (
              <tr key={ins.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                {/* Installation # */}
                <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                  <div className="flex items-center gap-1">
                    <span>{ins.installation_number}</span>
                  </div>
                  {ins.order_number && (
                    <span className="text-2xs text-slate-400 font-normal block font-mono">
                      ({ins.order_number})
                    </span>
                  )}
                </td>

                {/* Customer & Location */}
                <td className="py-3.5 px-4 max-w-[220px]">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {ins.customer_name}
                  </div>
                  <div className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="truncate">{ins.site_location || 'Customer Location'}</span>
                  </div>
                </td>

                {/* Crew Lead & Riggers */}
                <td className="py-3.5 px-4 text-xs">
                  <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-purple-500" />
                    <span>{ins.installer_lead_name || 'Lead Rigging Officer'}</span>
                  </div>
                  {ins.crew_members && ins.crew_members.length > 0 && (
                    <div className="text-2xs text-slate-400 truncate max-w-[180px] mt-0.5">
                      Crew: {ins.crew_members.join(', ')}
                    </div>
                  )}
                </td>

                {/* Scheduled Window */}
                <td className="py-3.5 px-4 text-xs font-mono">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {ins.installation_date}
                  </div>
                  <div className="text-2xs text-slate-400">
                    {ins.scheduled_time || '10:00 AM - 04:00 PM'}
                  </div>
                </td>

                {/* Equipment */}
                <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                  {ins.equipment_used || 'Scaffoldings, Drills, Safety Belts'}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  {getInstallationStatusBadge(ins.status)}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  {onUpdateStatus && ins.status !== 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => onUpdateStatus(ins.id, ins.status === 'scheduled' ? 'on_site' : 'completed')}
                      className={cn(
                        'h-7 text-2xs px-2.5 font-bold shadow-xs cursor-pointer',
                        ins.status === 'scheduled'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      )}
                    >
                      {ins.status === 'scheduled' ? (isBn ? 'অন-সাইট শুরু' : 'Start On-Site') : (isBn ? 'সম্পন্ন করুন' : 'Mark Completed')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {installations.map((ins) => (
          <div key={ins.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                {ins.installation_number}
              </div>
              {getInstallationStatusBadge(ins.status)}
            </div>

            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">{ins.customer_name}</div>
              <div className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                <span>{ins.site_location || 'Customer Site'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-2xs uppercase font-semibold text-slate-400 block">{isBn ? 'টিম লিড' : 'Crew Lead'}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{ins.installer_lead_name || 'Lead Officer'}</span>
              </div>
              <div>
                <span className="text-2xs uppercase font-semibold text-slate-400 block">{isBn ? 'তারিখ' : 'Date'}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{ins.installation_date}</span>
              </div>
            </div>

            {onUpdateStatus && ins.status !== 'completed' && (
              <div className="pt-1 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus(ins.id, ins.status === 'scheduled' ? 'on_site' : 'completed')}
                  className={cn(
                    'h-9 text-xs px-3 font-bold w-full',
                    ins.status === 'scheduled'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                >
                  {ins.status === 'scheduled' ? (isBn ? 'অন-সাইট ফিটিং শুরু' : 'Start On-Site') : (isBn ? 'কাজ সম্পন্ন ও সাইন-অফ' : 'Mark Completed')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

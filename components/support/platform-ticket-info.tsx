'use client'

// ==============================================================================
// InkFlow SaaS - Platform Support Ticket Context & Tenant Info Pane
// Authoritative context inspection: Tenant Plan, SLA timers, Assigned Staff,
// and Direct Support Impersonation Session Launcher.
// ==============================================================================

import React from 'react'
import Link from 'next/link'
import {
  Building2,
  User,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Tag,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  FileText,
  Mail,
  Smartphone,
  Timer,
  CheckCircle2,
} from 'lucide-react'
import {
  SupportConversationRecord,
  SUPPORT_STATUS_CONFIG,
  SUPPORT_PRIORITY_CONFIG,
  SUPPORT_CATEGORIES,
} from '@/types/support.types'
import { formatDate, formatTime, formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PlatformTicketInfoProps {
  conversation: SupportConversationRecord | null
  onOpenImpersonationModal?: (companyId: string, companyName: string) => void
}

export function PlatformTicketInfo({
  conversation,
  onOpenImpersonationModal,
}: PlatformTicketInfoProps) {
  if (!conversation) return null

  const categoryMeta = SUPPORT_CATEGORIES.find((c) => c.key === conversation.category)
  const statusConfig = SUPPORT_STATUS_CONFIG[conversation.status]
  const priorityConfig = SUPPORT_PRIORITY_CONFIG[conversation.priority]

  // Calculate First Response SLA elapsed
  const slaFirstResponse = conversation.first_response_at
    ? `${Math.round(
        Math.max(
          0,
          new Date(conversation.first_response_at).getTime() -
            new Date(conversation.created_at).getTime()
        ) / 60000
      )} mins`
    : 'Pending First Response'

  return (
    <div className="w-80 shrink-0 h-full overflow-y-auto bg-slate-900/60 p-4 border-l border-slate-800 space-y-5 text-xs">
      {/* 1. Ticket Overview Card */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ticket Attributes</span>
        </h3>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status</span>
            <span className={cn('px-2 py-0.5 rounded-md font-medium border text-[11px]', statusConfig.badgeClass)}>
              {statusConfig.labelEn}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Priority</span>
            <span className={cn('px-2 py-0.5 rounded-md font-medium border text-[11px]', priorityConfig.badgeClass)}>
              {priorityConfig.labelEn}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Category</span>
            <span className="font-medium text-slate-200">{categoryMeta?.labelEn || conversation.category}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Assigned Agent</span>
            <span className="font-medium text-indigo-400">
              {conversation.assigned_to_name || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tenant Context Card */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Tenant Details</span>
        </h3>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div>
            <div className="font-bold text-slate-100 text-sm">{conversation.company_name || 'Organization'}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Slug: {conversation.company_slug || 'app'}</div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{conversation.created_by_name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{conversation.created_by_email}</span>
            </div>
          </div>

          {/* Direct Support Session Trigger */}
          {onOpenImpersonationModal && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  onOpenImpersonationModal(
                    conversation.company_id,
                    conversation.company_name || 'Tenant'
                  )
                }
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/50 border border-amber-800/80 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Start Support Impersonation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. SLA & Response Timelines */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-purple-400" />
          <span>SLA & Response Timing</span>
        </h3>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-slate-400">
          <div className="flex items-center justify-between">
            <span>Created At</span>
            <span className="text-slate-200">{formatDateTime(conversation.created_at)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>First Response</span>
            <span className="text-slate-200 font-medium">{slaFirstResponse}</span>
          </div>

          {conversation.resolved_at && (
            <div className="flex items-center justify-between text-emerald-400">
              <span>Resolved At</span>
              <span>{formatDateTime(conversation.resolved_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Attached Context Metadata (if any) */}
      {conversation.context_metadata && Object.keys(conversation.context_metadata).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Attached Context</span>
          </h3>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-slate-300 font-mono text-[11px]">
            {Object.entries(conversation.context_metadata).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2 truncate">
                <span className="text-slate-400">{key}:</span>
                <span className="text-slate-200 truncate">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

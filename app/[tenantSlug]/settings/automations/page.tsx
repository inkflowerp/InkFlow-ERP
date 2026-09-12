'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Workflow,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  Layers,
  Send,
  MessageSquare,
  FileText,
  UserCheck,
  RotateCcw,
  Sliders,
  Check,
  X,
  Trash2,
  History,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, formatTime, formatDateTime } from '@/lib/formatters'
import {
  WorkflowRule,
  WorkflowExecutionLog,
  WorkflowTriggerType,
  WorkflowTriggerEntity,
  WorkflowActionType,
  TRIGGER_DEFINITIONS,
  ACTION_DEFINITIONS,
} from '@/types/workflow.types'
import { WorkflowService } from '@/services/workflow.service'
import {
  toggleWorkflowRuleAction,
  saveWorkflowRuleAction,
  deleteWorkflowRuleAction,
  testTriggerWorkflowRuleAction,
} from '@/actions/workflow.actions'
import { FeatureGate } from '@/components/shared/feature-gate'

export default function WorkflowAutomationsPage() {
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || 'my-company'

  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules')
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [logs, setLogs] = useState<WorkflowExecutionLog[]>([])
  const [selectedTriggerFilter, setSelectedTriggerFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal editor state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Partial<WorkflowRule> | null>(null)
  const [simulatingRuleId, setSimulatingRuleId] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<string | null>(null)

  const loadData = async () => {
    const rulesRes = await WorkflowService.getRules('c-01')
    if (rulesRes.success && rulesRes.data) {
      setRules(rulesRes.data)
    }

    const logsRes = await WorkflowService.getExecutionLogs('c-01')
    if (logsRes.success && logsRes.data) {
      setLogs(logsRes.data)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggle = async (ruleId: string, currentState: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentState } : r))
    )
    await toggleWorkflowRuleAction('c-01', ruleId, !currentState)
  }

  const handleTestRun = async (ruleId: string) => {
    setSimulatingRuleId(ruleId)
    setSimulationResult(null)

    const res = await testTriggerWorkflowRuleAction('c-01', ruleId)
    setSimulatingRuleId(null)

    if (res.success && res.data) {
      setSimulationResult(`Simulation Succeeded: ${res.data.actions_taken.length} actions executed.`)
      await loadData()
      setTimeout(() => setSimulationResult(null), 3500)
    } else {
      setSimulationResult(`Simulation Failed: ${res.error || 'Unknown error'}`)
      setTimeout(() => setSimulationResult(null), 3500)
    }
  }

  const handleOpenNewModal = () => {
    setEditingRule({
      name: '',
      description: '',
      is_active: true,
      trigger_type: 'status_changed',
      trigger_entity: 'order',
      trigger_config: { to_status: 'confirmed' },
      conditions: [],
      actions: [
        { type: 'create_document', config: { target_document: 'production_job' } },
        { type: 'send_notification', config: { title: 'Order Confirmed' } },
      ],
    })
    setIsModalOpen(true)
  }

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRule?.name) return

    await saveWorkflowRuleAction('c-01', editingRule)
    setIsModalOpen(false)
    setEditingRule(null)
    await loadData()
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this workflow rule?')) return
    await deleteWorkflowRuleAction('c-01', ruleId)
    await loadData()
  }

  const filteredRules = rules.filter((r) => {
    const matchesTrigger =
      selectedTriggerFilter === 'all' || r.trigger_type === selectedTriggerFilter
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesTrigger && matchesSearch
  })

  return (
    <FeatureGate feature="custom_workflows">
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Zap className="h-4 w-4" />
            <span>Process Orchestration Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Workflow className="h-7 w-7 text-indigo-400" />
            Workflow Automation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automate quotation conversions, press job generation, delivery dispatching, and multi-channel client alerts without custom code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={handleOpenNewModal}
            className="flex-1 sm:flex-none h-10 sm:h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 font-semibold shadow-lg shadow-indigo-600/30"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Automation Rule
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="flex-1 sm:flex-none h-10 sm:h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Safety & Architecture Compliance Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-slate-800 flex items-start gap-3.5">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-bold text-white text-sm flex flex-wrap items-center gap-2">
            <span>Declarative Trigger-Condition-Action Architecture Active</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              SAFE DETERMINISTIC PIPELINE
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Rules execute deterministically using pre-defined service handlers (Status changes, Task creation, Notifications, Bangladesh SMS, WhatsApp, and Document generation). No unrestricted code evaluation is permitted.
          </p>
        </div>
      </div>

      {simulationResult && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
          <span>{simulationResult}</span>
        </div>
      )}

      {/* Tab Switcher & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Automation Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Execution Logs ({logs.length})
          </button>
        </div>

        {activeTab === 'rules' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 sm:h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl w-full sm:w-56"
            />

            <select
              value={selectedTriggerFilter}
              onChange={(e) => setSelectedTriggerFilter(e.target.value)}
              className="h-10 sm:h-8 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 text-xs font-semibold focus:outline-hidden w-full sm:w-auto"
            >
              <option value="all">All Triggers</option>
              <option value="status_changed">Status Changed</option>
              <option value="record_created">Record Created</option>
              <option value="approval_completed">Approval Completed</option>
              <option value="date_reached">Date Reached</option>
              <option value="stock_threshold">Stock Threshold</option>
            </select>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: WORKFLOW RULES LIST                                           */}
      {/* ==================================================================== */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 gap-4">
          {filteredRules.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
              No automation rules matched your filter criteria.
            </div>
          ) : (
            filteredRules.map((rule) => (
              <Card
                key={rule.id}
                className={`bg-slate-900 border transition-all rounded-2xl overflow-hidden shadow-lg ${
                  rule.is_active ? 'border-slate-800' : 'border-slate-800/40 opacity-70'
                }`}
              >
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
                          <span>{rule.name}</span>
                          {!rule.is_active && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              PAUSED
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400 mt-0.5">
                          {rule.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>

                  {/* Top Right Controls: Toggle & Test Run */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/60">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={simulatingRuleId === rule.id}
                      onClick={() => handleTestRun(rule.id)}
                      className="h-9 sm:h-8 text-xs bg-slate-950 border-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-slate-900 rounded-xl px-3"
                    >
                      <Play className={`h-3 w-3 mr-1 ${simulatingRuleId === rule.id ? 'animate-spin' : ''}`} />
                      <span>{simulatingRuleId === rule.id ? 'Testing...' : 'Test Run'}</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.is_active}
                          onChange={() => handleToggle(rule.id, rule.is_active)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        title="Delete Rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
                  {/* Visual Workflow Pipeline diagram */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    {/* Trigger Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
                      <span className="text-[10px] uppercase text-indigo-400 font-mono">Trigger:</span>
                      <span>{rule.trigger_type.replace('_', ' ')}</span>
                      <span className="font-mono text-[10px] text-slate-400">({rule.trigger_entity})</span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-slate-600 shrink-0 hidden sm:block" />

                    {/* Conditions (if any) */}
                    {rule.conditions && rule.conditions.length > 0 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        <span className="text-[10px] uppercase text-amber-400 font-mono">Condition:</span>
                        <span>{rule.conditions[0].field} {rule.conditions[0].operator} {rule.conditions[0].value}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic px-1">Always matches</span>
                    )}

                    <ArrowRight className="h-4 w-4 text-slate-600 shrink-0 hidden sm:block" />

                    {/* Actions Pipeline */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {rule.actions.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium"
                        >
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">#{aIdx + 1}</span>
                          <span>{act.type.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Execution Metrics Footer */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 font-mono">
                    <div>
                      <span>Total Executions: </span>
                      <strong className="text-white">{rule.execution_count} runs</strong>
                    </div>
                    <div>
                      <span>Last Triggered: </span>
                      <strong className="text-slate-300">
                        {rule.last_executed_at ? new Date(rule.last_executed_at).toLocaleString() : 'Never'}
                      </strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AUDIT & EXECUTION LOGS                                        */}
      {/* ==================================================================== */}
      {activeTab === 'logs' && (
        <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <span>Workflow Execution Audit Stream</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Deterministic log of triggered rules, evaluated conditions, and executed service handlers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Executed At</th>
                    <th className="py-3 px-4">Workflow Rule</th>
                    <th className="py-3 px-4">Trigger & Entity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No workflow execution records found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {formatTime(log.executed_at, 'en', { second: '2-digit' })}
                          <div className="text-[10px] text-slate-500">
                            {formatDate(log.executed_at)}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {log.rule_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          <span className="text-indigo-300 font-bold">{log.trigger_type}</span>
                          <div className="text-[10px] text-slate-400">{log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                              log.status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : log.status === 'skipped'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 space-y-1">
                          {log.actions_taken.map((act, i) => (
                            <div key={i} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              <strong className="text-slate-400 font-mono text-[10px] uppercase">{act.action_type}:</strong>
                              <span>{act.detail}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No workflow execution records found.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-white">{log.rule_name}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {formatDateTime(log.executed_at, 'en', { second: '2-digit' })}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : log.status === 'skipped'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Trigger:</span>
                      <span className="font-mono text-indigo-300 font-bold">
                        {log.trigger_type} ({log.entity_type} {log.entity_id ? `• ${log.entity_id}` : ''})
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actions Taken:</div>
                      {log.actions_taken.map((act, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5 p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <div>
                            <span className="text-slate-400 font-mono text-[10px] uppercase font-bold mr-1">{act.action_type}:</span>
                            <span>{act.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* MODAL: RULE BUILDER / CREATOR                                       */}
      {/* ==================================================================== */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in-0">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create Automation Workflow</h3>
                <p className="text-xs text-slate-400">Declarative triggers and action pipeline</p>
              </div>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              {/* Name & Description */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Rule Name</label>
                  <Input
                    placeholder="e.g. Quotation Approved ➔ Auto-Create Order"
                    value={editingRule.name || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    className="h-10 bg-slate-950 border-slate-800 text-white rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-400 block mb-1">Description (Optional)</label>
                  <Input
                    placeholder="Describe what this automation accomplishes..."
                    value={editingRule.description || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                    className="h-10 bg-slate-950 border-slate-800 text-slate-300 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Step 2: Trigger & Entity */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="font-bold text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  <span>1. Define Trigger Event</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Trigger Type</label>
                    <select
                      value={editingRule.trigger_type}
                      onChange={(e) => setEditingRule({ ...editingRule, trigger_type: e.target.value as any })}
                      className="w-full h-10 sm:h-9 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 text-xs font-semibold focus:outline-hidden"
                    >
                      {TRIGGER_DEFINITIONS.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Trigger Entity</label>
                    <select
                      value={editingRule.trigger_entity}
                      onChange={(e) => setEditingRule({ ...editingRule, trigger_entity: e.target.value as any })}
                      className="w-full h-10 sm:h-9 bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 text-xs font-semibold focus:outline-hidden capitalize"
                    >
                      <option value="quotation">Quotation</option>
                      <option value="order">Order</option>
                      <option value="design">Design</option>
                      <option value="job">Job</option>
                      <option value="invoice">Invoice</option>
                      <option value="payment">Payment</option>
                      <option value="material">Material</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Actions Pipeline */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  <span>2. Action Pipeline</span>
                </div>

                <div className="space-y-2">
                  {editingRule.actions?.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white capitalize">{act.type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono break-all sm:break-normal">
                        {JSON.stringify(act.config)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <select
                    id="new-action-type"
                    className="h-10 sm:h-8 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-2 text-xs flex-1"
                    defaultValue="send_notification"
                  >
                    {ACTION_DEFINITIONS.map((a) => (
                      <option key={a.type} value={a.type}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const sel = document.getElementById('new-action-type') as HTMLSelectElement
                      const actionType = sel.value as WorkflowActionType
                      setEditingRule({
                        ...editingRule,
                        actions: [
                           ...(editingRule.actions || []),
                          { type: actionType, config: { auto: true } },
                        ],
                      })
                    }}
                    className="h-10 sm:h-8 text-xs border-slate-800 text-slate-300 rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Append Action
                  </Button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto h-11 sm:h-9 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto h-11 sm:h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 font-bold"
                >
                  Save Workflow Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </FeatureGate>
  )
}

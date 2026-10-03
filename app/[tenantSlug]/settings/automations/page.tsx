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
 Edit2,
 Search,
 Sparkles,
 Filter,
 Activity,
 Terminal,
 ChevronRight,
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
 WorkflowCondition,
 TRIGGER_DEFINITIONS,
 ACTION_DEFINITIONS,
 CONDITION_OPERATOR_DEFINITIONS,
} from '@/types/workflow.types'
import { useTenant } from '@/hooks/use-tenant'
import {
 getWorkflowRulesAction,
 getWorkflowExecutionLogsAction,
 toggleWorkflowRuleAction,
 saveWorkflowRuleAction,
 deleteWorkflowRuleAction,
 testTriggerWorkflowRuleAction,
} from '@/actions/workflow.actions'
import { FeatureGate } from '@/components/shared/feature-gate'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { useI18n } from '@/i18n/context'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

export default function WorkflowAutomationsPage() {
 const params = useParams()
 const tenantSlug = (params?.tenantSlug as string) || 'my-company'
 const { company } = useTenant()
 const { tBilingual } = useI18n()
 const activeCompanyId = company?.id || 'c-01'

 const [mounted, setMounted] = useState(false)
 const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules')
 const [rules, setRules] = useState<WorkflowRule[]>([])
 const [logs, setLogs] = useState<WorkflowExecutionLog[]>([])
 const [selectedTriggerFilter, setSelectedTriggerFilter] = useState<string>('all')
 const [logStatusFilter, setLogStatusFilter] = useState<string>('all')
 const [searchQuery, setSearchQuery] = useState('')

 useEffect(() => {
 setMounted(true)
  }, [])

  // Modal editor state
 const [isModalOpen, setIsModalOpen] = useState(false)
 const [editingRule, setEditingRule] = useState<Partial<WorkflowRule> | null>(null)
 const [newActionType, setNewActionType] = useState<WorkflowActionType>('send_notification')

  // Simulation test state
 const [simulatingRuleId, setSimulatingRuleId] = useState<string | null>(null)
 const [simulationLog, setSimulationLog] = useState<WorkflowExecutionLog | null>(null)
 const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false)

  // Rule delete confirm modal state
 const [ruleToDelete, setRuleToDelete] = useState<WorkflowRule | null>(null)
 const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
 const [isDeletingRule, setIsDeletingRule] = useState(false)

 const loadData = async () => {
 const rulesRes = await getWorkflowRulesAction(activeCompanyId)
 if (rulesRes.success && rulesRes.data) {
 setRules(rulesRes.data)
    }

 const logsRes = await getWorkflowExecutionLogsAction(activeCompanyId)
 if (logsRes.success && logsRes.data) {
 setLogs(logsRes.data)
    }
  }

 useEffect(() => {
 loadData()
  }, [activeCompanyId])

 const handleToggle = async (ruleId: string, currentState: boolean) => {
 setRules((prev) =>
 prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentState } : r))
    )
 await toggleWorkflowRuleAction(activeCompanyId, ruleId, !currentState)
 dispatchToast({
 type: 'info',
 title: !currentState ? 'Rule Activated' : 'Rule Paused',
 titleBn: !currentState ? 'রুল সক্রিয় করা হয়েছে' : 'রুল স্থগিত করা হয়েছে',
 message: !currentState ? 'Automations will now trigger on events.' : 'Rule has been paused.',
    })
  }

 const handleTestRun = async (ruleId: string) => {
 setSimulatingRuleId(ruleId)

 const res = await testTriggerWorkflowRuleAction(activeCompanyId, ruleId)
 setSimulatingRuleId(null)

 if (res.success && res.data) {
 setSimulationLog(res.data)
 setIsSimulationModalOpen(true)
 await loadData()
 dispatchToast({
 type: 'success',
 title: 'Simulation Succeeded',
 titleBn: 'সিমুলেশন সফল হয়েছে',
 message: `Executed ${res.data.actions_taken.length} automated pipeline actions.`,
      })
    } else {
 dispatchToast({
 type: 'error',
 title: 'Simulation Result',
 titleBn: 'সিমুলেশন ফলাফল',
 message: res.error || 'Rule conditions did not match simulated payload.',
      })
    }
  }

 const handleOpenNewModal = () => {
 setEditingRule({
 name: '',
 name_bn: '',
 description: '',
 is_active: true,
 trigger_type: 'status_changed',
 trigger_entity: 'quotation',
 trigger_config: { to_status: 'approved' },
 conditions: [],
 actions: [
        {
 type: 'create_document',
 config: { target_document: 'order', copy_items: true, note: 'Generated via automation' },
        },
        {
 type: 'send_notification',
 config: { title: 'Order Generated', message: 'Job order spawned from approved quote' },
        },
      ],
    })
 setIsModalOpen(true)
  }

 const handleEditRule = (rule: WorkflowRule) => {
 setEditingRule(JSON.parse(JSON.stringify(rule)))
 setIsModalOpen(true)
  }

 const handleSaveRule = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!editingRule?.name) return

 const res = await saveWorkflowRuleAction(activeCompanyId, editingRule)
 if (res.success) {
 dispatchToast({
 type: 'success',
 title: 'Rule Saved',
 titleBn: 'ওয়ার্কফ্লো রুল সংরক্ষিত হয়েছে',
 message: `Rule"${editingRule.name}"is now updated.`,
      })
 setIsModalOpen(false)
 setEditingRule(null)
 await loadData()
    } else {
 dispatchToast({
 type: 'error',
 title: 'Failed to Save',
 titleBn: 'সংরক্ষণ ব্যর্থ হয়েছে',
 message: res.error || 'Failed to save workflow rule.',
      })
    }
  }

 const handleDeleteRule = (rule: WorkflowRule) => {
 setRuleToDelete(rule)
 setIsDeleteConfirmOpen(true)
  }

 const confirmDeleteRule = async () => {
 if (!ruleToDelete) return
 setIsDeletingRule(true)
 try {
 await deleteWorkflowRuleAction(activeCompanyId, ruleToDelete.id)
 dispatchToast({
 type: 'success',
 title: 'Rule Deleted',
 titleBn: 'ওয়ার্কফ্লো রুল মুছে ফেলা হয়েছে',
 message: `Workflow rule"${ruleToDelete.name}"was removed.`,
      })
 setIsDeleteConfirmOpen(false)
 setRuleToDelete(null)
 await loadData()
    } catch (err: any) {
 dispatchToast({
 type: 'error',
 title: 'Error',
 titleBn: 'ত্রুটি',
 message: err.message || 'Failed to delete workflow rule.',
      })
    } finally {
 setIsDeletingRule(false)
    }
  }

  // Helper to add condition
 const handleAddCondition = () => {
 if (!editingRule) return
 const currentConditions = editingRule.conditions || []
 setEditingRule({
      ...editingRule,
 conditions: [
        ...currentConditions,
        { field: 'pricing.total_amount', operator: 'greater_than', value: '50000' },
      ],
    })
  }

  // Helper to remove condition
 const handleRemoveCondition = (index: number) => {
 if (!editingRule || !editingRule.conditions) return
 const updated = [...editingRule.conditions]
 updated.splice(index, 1)
 setEditingRule({ ...editingRule, conditions: updated })
  }

  // Helper to update condition
 const handleUpdateCondition = (index: number, patch: Partial<WorkflowCondition>) => {
 if (!editingRule || !editingRule.conditions) return
 const updated = [...editingRule.conditions]
 updated[index] = { ...updated[index], ...patch }
 setEditingRule({ ...editingRule, conditions: updated })
  }

  // Helper to add action
 const handleAddAction = () => {
 if (!editingRule) return
 let defaultConfig: Record<string, any> = {}

 switch (newActionType) {
 case 'create_document':
 defaultConfig = { target_document: 'order', copy_items: true }
 break
 case 'change_status':
 defaultConfig = { target: 'job', new_status: 'in_production' }
 break
 case 'send_sms':
 defaultConfig = { message: 'Order status updated successfully.', recipient: '+8801700000000' }
 break
 case 'send_whatsapp':
 defaultConfig = { template: 'order_update', recipient: '+8801700000000' }
 break
 case 'send_notification':
 defaultConfig = { title: 'Workflow Alert', message: 'Automated workflow notification' }
 break
 case 'create_task':
 defaultConfig = { task_type: 'prepress_check', priority: 'high', assign_to: 'Staff' }
 break
 case 'assign_employee':
 defaultConfig = { role: 'operator' }
 break
 default:
 defaultConfig = { auto: true }
    }

 setEditingRule({
      ...editingRule,
 actions: [...(editingRule.actions || []), { type: newActionType, config: defaultConfig }],
    })
  }

  // Helper to remove action
 const handleRemoveAction = (index: number) => {
 if (!editingRule || !editingRule.actions) return
 const updated = [...editingRule.actions]
 updated.splice(index, 1)
 setEditingRule({ ...editingRule, actions: updated })
  }

  // Helper to update action config
 const handleUpdateActionConfig = (index: number, key: string, val: any) => {
 if (!editingRule || !editingRule.actions) return
 const updated = [...editingRule.actions]
 updated[index] = {
      ...updated[index],
 config: { ...updated[index].config, [key]: val },
    }
 setEditingRule({ ...editingRule, actions: updated })
  }

 const filteredRules = rules.filter((r) => {
 const matchesTrigger =
 selectedTriggerFilter === 'all' || r.trigger_type === selectedTriggerFilter
 const matchesSearch =
 r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.name_bn && r.name_bn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
 return matchesTrigger && matchesSearch
  })

 const filteredLogs = logs.filter((log) => {
 const matchesStatus = logStatusFilter === 'all' || log.status === logStatusFilter
 const matchesSearch =
 log.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
 log.trigger_type.toLowerCase().includes(searchQuery.toLowerCase())
 return matchesStatus && matchesSearch
  })

 if (!mounted) {
 return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-full"/>
        <div className="h-12 bg-muted rounded-xl w-3/4"/>
        <div className="h-64 bg-muted rounded-xl w-full"/>
      </div>
    )
  }

 return (
    <FeatureGate feature="custom_workflows">
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
        <PageHeader
 titleEn="Workflow Automations Engine"titleBn="কাজের অটোমেশন ও পাইপলাইন"descriptionEn="Automate quotation conversions, press job generation, delivery dispatching, and multi-channel client alerts without custom code."descriptionBn="কোটেশন রূপান্তর, প্রেস জব জেনারেশন এবং ক্লায়েন্ট অ্যালার্ট সম্পূর্ণ কোডহীনভাবে অটোমেট করুন।"icon={Workflow}
 iconColor="text-indigo-600 dark:text-indigo-400"actions={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
 size="sm"onClick={handleOpenNewModal}
 className="flex-1 sm:flex-none h-10 sm:h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3.5 font-semibold shadow-xs shadow-indigo-600/20">
                <Plus className="h-3.5 w-3.5 mr-1.5"/>
                {tBilingual('New Auto Rule', 'নতুন অটোমেশন রুল')}
              </Button>
              <Button
 size="sm"variant="outline"onClick={loadData}
 className="h-9 w-9 p-0 flex items-center justify-center shrink-0 border-border bg-card text-foreground hover:bg-muted rounded-xl cursor-pointer"title={tBilingual('Refresh', 'রিফ্রেশ')}
 aria-label={tBilingual('Refresh', 'রিফ্রেশ')}
              >
                <RotateCcw className="h-3.5 w-3.5"/>
              </Button>
            </div>
          }
        />

        {/* Safety & Architecture Compliance Banner */}
        <div className="p-4 rounded-xl bg-card border border-border flex items-start gap-3.5 shadow-xs">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5"/>
          </div>
          <div className="text-xs space-y-1">
            <div className="font-bold text-foreground text-sm flex flex-wrap items-center gap-2">
              <span>{tBilingual('Declarative Trigger-Condition-Action Architecture', 'নিরাপদ ডিক্লারেটিভ ট্রিগার-শর্ত-অ্যাকশন ইঞ্জিন')}</span>
              <span className="text-2xs tabular-nums px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold">
 SAFE DETERMINISTIC PIPELINE
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
 Rules execute deterministically using pre-defined service handlers (Status changes, Task creation, Notifications, Bangladesh SMS, WhatsApp, and Document generation) with automatic loop prevention and depth guarding.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border /80 overflow-x-auto">
            <button
 onClick={() => setActiveTab('rules')}
 className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap ${
 activeTab === 'rules'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
 Automation Rules ({rules.length})
            </button>
            <button
 onClick={() => setActiveTab('logs')}
 className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap ${
 activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
 Execution Logs ({logs.length})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
              <Input
 placeholder={activeTab === 'rules' ? 'Search rules...' : 'Search logs by rule or ID...'}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-10 sm:h-9 text-xs bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl pl-8"/>
            </div>

            {activeTab === 'rules' ? (
              <select
 value={selectedTriggerFilter}
 onChange={(e) => setSelectedTriggerFilter(e.target.value)}
 className="h-10 sm:h-9 bg-muted border border-border text-foreground rounded-xl px-3 text-xs font-semibold focus:outline-hidden">
                <option value="all">{tBilingual('All Trigger Types', 'সকল ট্রিগার টাইপ')}</option>
                {TRIGGER_DEFINITIONS.map((td) => (
                  <option key={td.type} value={td.type}>
                    {td.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
 value={logStatusFilter}
 onChange={(e) => setLogStatusFilter(e.target.value)}
 className="h-10 sm:h-9 bg-muted border border-border text-foreground rounded-xl px-3 text-xs font-semibold focus:outline-hidden">
                <option value="all">{tBilingual("All Execution Statuses", "সকল এক্সিকিউশন অবস্থা")}</option>
                <option value="success">{tBilingual("Success Only", "শুধুমাত্র সফল")}</option>
                <option value="skipped">{tBilingual("Skipped Only", "শুধুমাত্র বাদ দেওয়া")}</option>
                <option value="failed">{tBilingual("Failed Only", "শুধুমাত্র ব্যর্থ")}</option>
              </select>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: WORKFLOW RULES LIST                                           */}
        {/* ==================================================================== */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 gap-4">
            {filteredRules.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-xs bg-card rounded-xl border border-border">
 No automation rules matched your filter criteria.
              </div>
            ) : (
 filteredRules.map((rule) => (
                <Card
 key={rule.id}
 className={`bg-card border transition-all rounded-xl overflow-hidden shadow-xs hover:shadow-xs ${
 rule.is_active
                      ? 'border-border '
                      : 'border-border /40 opacity-75'
                  }`}
                >
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border /80 bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-start gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="h-4 w-4"/>
                        </div>
                        <div>
                          <CardTitle className="text-sm sm:text-base font-bold text-foreground flex flex-wrap items-center gap-2">
                            <span>{rule.name}</span>
                            {rule.name_bn && (
                              <span className="text-xs font-normal text-muted-foreground font-sans">
                                ({rule.name_bn})
                              </span>
                            )}
                            {rule.is_active ? (
                              <span className="text-2xs tabular-nums px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>
 ACTIVE
                              </span>
                            ) : (
                              <span className="text-2xs tabular-nums px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
 PAUSED
                              </span>
                            )}
                          </CardTitle>
                          {rule.description && (
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                              {rule.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Top Right Controls: Edit, Toggle & Test Run */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border /60">
                      <Button
 size="sm"variant="outline"disabled={simulatingRuleId === rule.id}
 onClick={() => handleTestRun(rule.id)}
 className="h-8 text-xs border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl px-2.5 font-semibold"title="Simulate rule in sandbox">
                        <Play
 className={`h-3 w-3 mr-1 ${
 simulatingRuleId === rule.id ? 'animate-spin' : ''
                          }`}
                        />
                        <span>{simulatingRuleId === rule.id ? 'Testing...' : 'Test Run'}</span>
                      </Button>

                      <Button
 size="sm"variant="outline"onClick={() => handleEditRule(rule)}
 className="h-8 text-xs border-border bg-card text-foreground hover:bg-muted rounded-xl px-2.5"title="Edit workflow rule">
                        <Edit2 className="h-3 w-3 mr-1"/>
                        <span>Edit</span>
                      </Button>

                      <div className="flex items-center gap-1.5 pl-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
 type="checkbox"checked={rule.is_active}
 onChange={() => handleToggle(rule.id, rule.is_active)}
 className="sr-only peer"/>
                          <div className="w-10 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-input after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>

                        <button
 onClick={() => handleDeleteRule(rule)}
 className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"title="Delete Rule">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
                    {/* Visual Workflow Pipeline Diagram */}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 p-3 rounded-xl bg-muted border border-border /80">
                      {/* Trigger Badge */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-300 font-bold">
                        <span className="text-2xs uppercase text-indigo-600 dark:text-indigo-400 tabular-nums">
 Trigger:
                        </span>
                        <span className="capitalize">{rule.trigger_type.replace('_', ' ')}</span>
                        <span className="tabular-nums text-2xs text-muted-foreground">
                          ({rule.trigger_entity}
                          {rule.trigger_config?.to_status ? ` ➔ ${rule.trigger_config.to_status}` : ''})
                        </span>
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block"/>

                      {/* Conditions (if any) */}
                      {rule.conditions && rule.conditions.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {rule.conditions.map((cond, cIdx) => {
 const opDef = CONDITION_OPERATOR_DEFINITIONS.find((o) => o.operator === cond.operator)
 return (
                              <div
 key={cIdx}
 className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 font-medium">
                                <span className="text-2xs uppercase text-amber-600 dark:text-amber-400 tabular-nums font-bold">
 IF:
                                </span>
                                <span className="tabular-nums text-xs">{cond.field}</span>
                                <span className="font-bold tabular-nums px-1 py-0.5 rounded bg-amber-200/50 dark:bg-amber-900/40 text-2xs">
                                  {opDef?.symbol || cond.operator}
                                </span>
                                <span className="font-bold">{String(cond.value)}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-2xs text-muted-foreground italic px-1">
 Always matches (No conditions)
                        </span>
                      )}

                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block"/>

                      {/* Actions Pipeline */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rule.actions.map((act, aIdx) => (
                          <div
 key={aIdx}
 className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300 font-medium">
                            <span className="text-2xs tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
                              #{aIdx + 1}
                            </span>
                            <span className="capitalize">{act.type.replace('_', ' ')}</span>
                            {act.config?.target_document && (
                              <span className="text-2xs tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">
                                ({act.config.target_document})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Execution Metrics Footer */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-2xs text-muted-foreground pt-1 tabular-nums">
                      <div>
                        <span>Total Executions: </span>
                        <strong className="text-foreground">{rule.execution_count} runs</strong>
                      </div>
                      <div>
                        <span>Last Triggered: </span>
                        <strong className="text-foreground">
                          {rule.last_executed_at ? formatDateTime(rule.last_executed_at) : 'Never'}
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
          <Card className="bg-card border-border rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border pb-3.5 bg-muted">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400"/>
                <span>Workflow Execution Audit Stream</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
 Deterministic log of triggered rules, evaluated conditions, and executed service handlers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground border-b border-border font-semibold uppercase tracking-wider text-2xs">
                    <tr>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Executed At', 'সম্পন্নের সময়')}</th>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Workflow Rule', 'ওয়ার্কফ্লো রুল')}</th>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Trigger & Entity', 'ট্রিগার ও বিষয়')}</th>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Actions Executed', 'সম্পাদিত অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border/80 text-foreground">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          {tBilingual("No workflow execution records found matching your filters.", "ফিল্টারের সাথে মেলে এমন কোনো ওয়ার্কফ্লো রেকর্ড পাওয়া যায়নি।")}
                        </td>
                      </tr>
                    ) : (
 filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatTime(log.executed_at, 'en', { second: '2-digit' })}
                            <div className="text-2xs text-muted-foreground">
                              {formatDate(log.executed_at)}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-foreground">
                            {log.rule_name}
                          </td>
                          <td className="py-3 px-4 tabular-nums text-xs">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold capitalize">
                              {log.trigger_type.replace('_', ' ')}
                            </span>
                            <div className="text-2xs text-muted-foreground">
                              {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
 className={`px-2 py-0.5 rounded-full text-2xs tabular-nums font-bold uppercase border ${
 log.status === 'success'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                  : log.status === 'skipped'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            {log.actions_taken.map((act, i) => (
                              <div key={i} className="text-2xs text-foreground flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>
                                <strong className="text-muted-foreground tabular-nums text-2xs uppercase">
                                  {act.action_type}:
                                </strong>
                                <span>{act.detail}</span>
                                {act.latency_ms !== undefined && (
                                  <span className="text-2xs tabular-nums px-1 rounded bg-muted text-muted-foreground">
                                    {act.latency_ms}ms
                                  </span>
                                )}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden divide-y divide-border dark:divide-border/80">
                {filteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                          {tBilingual("No workflow execution records found matching your filters.", "ফিল্টারের সাথে মেলে এমন কোনো ওয়ার্কফ্লো রেকর্ড পাওয়া যায়নি।")}
                  </div>
                ) : (
 filteredLogs.map((log) => (
                    <div key={log.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-foreground">{log.rule_name}</div>
                          <div className="text-2xs tabular-nums text-muted-foreground mt-0.5">
                            {formatDateTime(log.executed_at, 'en', { second: '2-digit' })}
                          </div>
                        </div>
                        <span
 className={`px-2 py-0.5 rounded-full text-2xs tabular-nums font-bold uppercase border ${
 log.status === 'success'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                              : log.status === 'skipped'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted border border-border /80 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Trigger:</span>
                        <span className="tabular-nums text-indigo-600 dark:text-indigo-400 font-bold capitalize">
                          {log.trigger_type.replace('_', ' ')} ({log.entity_type} {log.entity_id ? `• ${log.entity_id}` : ''})
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="text-2xs uppercase font-bold text-muted-foreground tracking-wider">
 Actions Taken:
                        </div>
                        {log.actions_taken.map((act, i) => (
                          <div
 key={i}
 className="text-xs text-foreground flex items-start gap-1.5 p-2 rounded-lg bg-muted border border-border /60">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"/>
                            <div>
                              <span className="text-muted-foreground tabular-nums text-2xs uppercase font-bold mr-1">
                                {act.action_type}:
                              </span>
                              <span>{act.detail}</span>
                              {act.latency_ms !== undefined && (
                                <span className="ml-1 text-2xs tabular-nums px-1 rounded bg-muted text-muted-foreground">
                                  {act.latency_ms}ms
                                </span>
                              )}
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
        {editingRule && (
          <ModalDialog
 open={isModalOpen}
 onOpenChange={(open) => {
 if (!open) setIsModalOpen(false)
            }}
 size="3xl"title={
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold shrink-0">
                  <Workflow className="h-5 w-5"/>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-foreground">
                      {editingRule.id ? 'Edit Automation Rule' : 'Create Automation Workflow'}
                    </span>
                    <Badge
 variant="outline"className="text-2xs uppercase tabular-nums py-0.5 px-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
 Pipeline Engine
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground">
 Declarative triggers, conditions, and real-time action pipeline
                  </p>
                </div>
              </div>
            }
          >
            <form onSubmit={handleSaveRule} className="space-y-4 pt-1">
              {/* Section 1: Rule Details */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Rule Identity
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
 Rule Name (English) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
 placeholder={tBilingual("e.g. Quotation Approved ➔ Auto-Create Order", "যেমন: কোটেশন অনুমোদন ➔ স্বয়ংক্রিয় অর্ডার তৈরি")}value={editingRule.name || ''}
 onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
 className="text-xs h-9"required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
 Rule Name (Bengali - ঐচ্ছিক)
                    </Label>
                    <Input
 placeholder="যেমন: কোটেশন অনুমোদন ➔ সরাসরি অর্ডার তৈরি"value={editingRule.name_bn || ''}
 onChange={(e) => setEditingRule({ ...editingRule, name_bn: e.target.value })}
 className="text-xs h-9"/>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">Description</Label>
                  <Input
 placeholder={tBilingual("Describe the workflow business purpose...", "ওয়ার্কফ্লোর উদ্দেশ্য ও কাজের বিবরণ লিখুন...")}value={editingRule.description || ''}
 onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
 className="text-xs h-9"/>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
 type="checkbox"checked={editingRule.is_active ?? true}
 onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
 className="sr-only peer"/>
                    <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-input after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className="text-xs font-semibold text-foreground">
 Rule is Active & Enabled
                  </span>
                </div>
              </div>

              {/* Section 2: Trigger Event & Config */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Trigger Event & Entity
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Trigger Event</Label>
                    <select
 value={editingRule.trigger_type}
 onChange={(e) =>
 setEditingRule({ ...editingRule, trigger_type: e.target.value as any })
                      }
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium">
                      {TRIGGER_DEFINITIONS.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label} ({t.labelBn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Target Entity</Label>
                    <select
 value={editingRule.trigger_entity}
 onChange={(e) =>
 setEditingRule({ ...editingRule, trigger_entity: e.target.value as any })
                      }
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium capitalize">
                      <option value="quotation">{tBilingual("Quotation", "কোটেশন")}</option>
                      <option value="order">{tBilingual("Sales Order", "অর্ডার")}</option>
                      <option value="design">{tBilingual("Design / Prepress", "ডিজাইন ও প্রিপ্রেস")}</option>
                      <option value="job">{tBilingual("Production Job", "প্রেস জব")}</option>
                      <option value="invoice">{tBilingual("Invoice", "বিল/চালান")}</option>
                      <option value="payment">{tBilingual("Payment", "পেমেন্ট")}</option>
                      <option value="material">{tBilingual("Material / Stock", "উপাদান ও স্টক")}</option>
                      <option value="delivery">{tBilingual("Delivery", "ডেলিভারি")}</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
 Target State / Status
                    </Label>
                    <Input
 placeholder={tBilingual("e.g. approved, confirmed, ready", "যেমন: approved, confirmed, ready")}value={editingRule.trigger_config?.to_status || ''}
 onChange={(e) =>
 setEditingRule({
                          ...editingRule,
 trigger_config: { ...editingRule.trigger_config, to_status: e.target.value },
                        })
                      }
 className="text-xs h-9"/>
                  </div>
                </div>
              </div>

              {/* Section 3: Conditional Rules (IF / AND) */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Conditions (Filter Rules)
                    </h3>
                  </div>

                  <Button
 type="button"size="sm"variant="outline"onClick={handleAddCondition}
 className="h-7 text-xs border-border text-foreground hover:bg-muted hover:bg-amber-50 dark:hover:bg-amber-950/40">
                    <Plus className="h-3 w-3 mr-1"/>
 Add Condition
                  </Button>
                </div>

                {(!editingRule.conditions || editingRule.conditions.length === 0) ? (
                  <div className="p-3 rounded-lg bg-muted border border-dashed border-border text-xs text-muted-foreground text-center">
 No conditions configured. This rule will trigger on every matching event.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {editingRule.conditions.map((cond, cIdx) => (
                      <div
 key={cIdx}
 className="p-2.5 rounded-lg bg-muted border border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
                        <span className="text-2xs tabular-nums font-bold text-amber-600 dark:text-amber-400 shrink-0">
 IF #{cIdx + 1}
                        </span>

                        <Input
 placeholder={tBilingual("field (e.g. pricing.total_amount)", "ফিল্ড (যেমন: pricing.total_amount)")}value={cond.field}
 onChange={(e) => handleUpdateCondition(cIdx, { field: e.target.value })}
 className="h-8 text-xs flex-1"/>

                        <select
 value={cond.operator}
 onChange={(e) =>
 handleUpdateCondition(cIdx, { operator: e.target.value as any })
                          }
 className="h-8 rounded-lg border border-input bg-card px-2 text-xs font-medium">
                          {CONDITION_OPERATOR_DEFINITIONS.map((op) => (
                            <option key={op.operator} value={op.operator}>
                              {op.symbol} {op.label}
                            </option>
                          ))}
                        </select>

                        <Input
 placeholder={tBilingual("value (e.g. 50000)", "মান (যেমন: 50000)")}value={String(cond.value ?? '')}
 onChange={(e) => handleUpdateCondition(cIdx, { value: e.target.value })}
 className="h-8 text-xs flex-1"/>

                        <button
 type="button"onClick={() => handleRemoveCondition(cIdx)}
 className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Action Pipeline (THEN) */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Action Pipeline (Sequence)
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {editingRule.actions?.map((act, idx) => (
                    <div
 key={idx}
 className="p-3 rounded-lg bg-muted border border-border space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 tabular-nums text-2xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-foreground capitalize">
                            {act.type.replace('_', ' ')}
                          </span>
                        </div>

                        <button
 type="button"onClick={() => handleRemoveAction(idx)}
 className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>

                      {/* Action Specific Config Editor */}
                      {act.type === 'create_document' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 Target Document
                            </Label>
                            <select
 value={act.config?.target_document || 'order'}
 onChange={(e) =>
 handleUpdateActionConfig(idx, 'target_document', e.target.value)
                              }
 className="h-8 w-full rounded border border-input bg-card text-xs px-2">
                              <option value="order">{tBilingual("Sales Order", "জব বুকিং / অর্ডার")}</option>
                              <option value="production_job">{tBilingual("Production Job Ticket", "প্রেস টিকিট")}</option>
                              <option value="delivery_challan">{tBilingual("Delivery Challan", "চালান")}</option>
                              <option value="invoice">{tBilingual("Commercial Invoice", "ইনভয়েস")}</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 Copy Line Items
                            </Label>
                            <select
 value={act.config?.copy_items ? 'yes' : 'no'}
 onChange={(e) =>
 handleUpdateActionConfig(idx, 'copy_items', e.target.value === 'yes')
                              }
 className="h-8 w-full rounded border border-input bg-card text-xs px-2">
                              <option value="yes">{tBilingual("Yes, Clone items & pricing", "হ্যাঁ, আইটেম ও দর কপি করুন")}</option>
                              <option value="no">{tBilingual("No, Header only", "না, শুধুমাত্র হেডার")}</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {act.type === 'send_notification' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 Notification Title
                            </Label>
                            <Input
 value={act.config?.title || ''}
 onChange={(e) => handleUpdateActionConfig(idx, 'title', e.target.value)}
 className="h-8 text-xs"placeholder={tBilingual("e.g. Order Generated", "যেমন: নতুন অর্ডার তৈরি হয়েছে")}/>
                          </div>
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 Message Content
                            </Label>
                            <Input
 value={act.config?.message || ''}
 onChange={(e) => handleUpdateActionConfig(idx, 'message', e.target.value)}
 className="h-8 text-xs"placeholder={tBilingual("Notification description...", "নোটিফিকেশনের বিবরণ লিখুন...")}/>
                          </div>
                        </div>
                      )}

                      {act.type === 'send_sms' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 SMS Message
                            </Label>
                            <Input
 value={act.config?.message || ''}
 onChange={(e) => handleUpdateActionConfig(idx, 'message', e.target.value)}
 className="h-8 text-xs"placeholder={tBilingual("e.g. Your order is ready.", "যেমন: আপনার অর্ডারটি প্রস্তুত হয়েছে।")}/>
                          </div>
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 Recipient Number / Context
                            </Label>
                            <Input
 value={act.config?.recipient || ''}
 onChange={(e) => handleUpdateActionConfig(idx, 'recipient', e.target.value)}
 className="h-8 text-xs tabular-nums"placeholder="+8801700000000 or customer_phone"/>
                          </div>
                        </div>
                      )}

                      {act.type === 'change_status' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 Target Entity
                            </Label>
                            <Input
 value={act.config?.target || 'order'}
 onChange={(e) => handleUpdateActionConfig(idx, 'target', e.target.value)}
 className="h-8 text-xs"placeholder={tBilingual("order, job, invoice", "order, job, invoice")}/>
                          </div>
                          <div>
                            <Label className="text-2xs font-medium text-muted-foreground mb-0.5 block">
 New Status
                            </Label>
                            <Input
 value={act.config?.new_status || ''}
 onChange={(e) => handleUpdateActionConfig(idx, 'new_status', e.target.value)}
 className="h-8 text-xs"placeholder={tBilingual("in_production, completed", "in_production, completed")}/>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border">
                  <select
 value={newActionType}
 onChange={(e) => setNewActionType(e.target.value as WorkflowActionType)}
 className="h-9 bg-card border border-input text-foreground rounded-lg px-3 text-xs flex-1 font-medium">
                    {ACTION_DEFINITIONS.map((a) => (
                      <option key={a.type} value={a.type}>
                        {a.label} ({a.labelBn})
                      </option>
                    ))}
                  </select>
                  <Button
 type="button"size="sm"variant="outline"onClick={handleAddAction}
 className="h-9 text-xs border-border text-foreground hover:bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    <Plus className="h-3.5 w-3.5 mr-1"/>
 Append Action
                  </Button>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
                <Button
 type="button"variant="outline"onClick={() => setIsModalOpen(false)}
 className="w-full sm:w-auto min-h-[40px] text-xs font-semibold">
 Cancel
                </Button>
                <Button
 type="submit"className="w-full sm:w-auto min-h-[40px] text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm px-6">
 Save Workflow Rule
                </Button>
              </div>
            </form>
          </ModalDialog>
        )}

        {/* Diagnostic Simulation Result Dialog */}
        {simulationLog && (
          <ModalDialog
 open={isSimulationModalOpen}
 onOpenChange={setIsSimulationModalOpen}
 size="lg"title={
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                  <Play className="h-4 w-4"/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
 Workflow Simulation Output
                  </h3>
                  <p className="text-2xs text-muted-foreground tabular-nums">
 Rule: {simulationLog.rule_name}
                  </p>
                </div>
              </div>
            }
          >
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                <div>
                  <span className="text-2xs uppercase font-bold text-muted-foreground block tabular-nums">Status</span>
                  <span
 className={`tabular-nums text-xs font-bold uppercase ${
 simulationLog.status === 'success'
                        ? 'text-emerald-500'
                        : simulationLog.status === 'skipped'
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {simulationLog.status}
                  </span>
                </div>
                <div>
                  <span className="text-2xs uppercase font-bold text-muted-foreground block tabular-nums">Timestamp</span>
                  <span className="tabular-nums text-foreground">
                    {formatTime(simulationLog.executed_at, 'en', { second: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-2xs uppercase font-bold text-muted-foreground block tabular-nums">Actions Fired</span>
                  <span className="tabular-nums text-indigo-500 font-bold">
                    {simulationLog.actions_taken.length} steps
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-2xs uppercase font-bold text-muted-foreground tracking-wider">
 Action Execution Trace:
                </h4>
                {simulationLog.actions_taken.map((act, i) => (
                  <div
 key={i}
 className="p-2.5 rounded-lg bg-muted border border-border flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0"/>
                      <div>
                        <div className="tabular-nums font-bold text-2xs uppercase text-muted-foreground">
                          {act.action_type}
                        </div>
                        <div className="text-foreground mt-0.5">{act.detail}</div>
                      </div>
                    </div>
                    {act.latency_ms !== undefined && (
                      <span className="text-2xs tabular-nums px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {act.latency_ms}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
 size="sm"onClick={() => setIsSimulationModalOpen(false)}
 className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4">
 Close Diagnostic
                </Button>
              </div>
            </div>
          </ModalDialog>
        )}

        {/* Delete Rule Confirm Dialog */}
        <ConfirmDialog
 open={isDeleteConfirmOpen}
 onOpenChange={setIsDeleteConfirmOpen}
 title={`Delete Workflow Rule"${ruleToDelete?.name || ''}"?`}
 titleBn={`ওয়ার্কফ্লো রুল"${ruleToDelete?.name || ''}"মুছে ফেলবেন?`}
 message="Are you sure you want to delete this automation rule? It will immediately stop triggering actions."messageBn="আপনি কি এই অটোমেশন রুলটি মুছে ফেলতে চান? এটি তাৎক্ষণিকভাবে অ্যাকশন ট্রিগার করা বন্ধ করবে।"confirmText="Delete Rule"confirmTextBn="রুল মুছুন"cancelText="Cancel"cancelTextBn="বাতিল"isDestructive={true}
 isLoading={isDeletingRule}
 onConfirm={confirmDeleteRule}
        />
      </div>
    </FeatureGate>
  )
}

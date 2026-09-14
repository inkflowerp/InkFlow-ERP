'use client'

import { useState } from 'react'
import type { BranchMasterRecord, BranchStatus } from '../../types/branch.types.ts'
import {
  createBranchAction,
  updateBranchAction,
  setBranchStatusAction,
} from '../../actions/branch.actions.ts'

interface BranchManagementTableProps {
  initialBranches: BranchMasterRecord[]
  canManage: boolean
}

export function BranchManagementTable({
  initialBranches,
  canManage,
}: BranchManagementTableProps) {
  const [branches, setBranches] = useState<BranchMasterRecord[]>(initialBranches)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchMasterRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    name_bn: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    area: '',
    full_address: '',
    full_address_bn: '',
    is_main: false,
    manager_name: '',
    operating_hours: '9:00 AM - 8:00 PM (Sat-Thu)',
    contact_person: '',
    contact_phone: '',
  })

  const openCreateModal = () => {
    setEditingBranch(null)
    setFormData({
      name: '',
      name_bn: '',
      code: '',
      phone: '',
      email: '',
      address: '',
      area: '',
      full_address: '',
      full_address_bn: '',
      is_main: false,
      manager_name: '',
      operating_hours: '9:00 AM - 8:00 PM (Sat-Thu)',
      contact_person: '',
      contact_phone: '',
    })
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (branch: BranchMasterRecord) => {
    setEditingBranch(branch)
    setFormData({
      name: branch.name,
      name_bn: branch.name_bn || '',
      code: branch.code,
      phone: branch.phone || '',
      email: branch.email || '',
      address: branch.address || '',
      area: branch.area || '',
      full_address: branch.full_address || '',
      full_address_bn: branch.full_address_bn || '',
      is_main: branch.is_main,
      manager_name: branch.manager_name || '',
      operating_hours: branch.operating_hours || '9:00 AM - 8:00 PM (Sat-Thu)',
      contact_person: branch.contact_person || '',
      contact_phone: branch.contact_phone || '',
    })
    setError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (editingBranch) {
        const res = await updateBranchAction(editingBranch.id, formData)
        if (!res.success) throw new Error(res.error)
        setBranches((prev) =>
          prev.map((b) => (b.id === editingBranch.id ? (res.data as BranchMasterRecord) : b))
        )
      } else {
        const res = await createBranchAction(formData)
        if (!res.success) throw new Error(res.error)
        setBranches((prev) => [...prev, res.data as BranchMasterRecord])
      }
      setIsModalOpen(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (branchId: string, status: BranchStatus) => {
    try {
      const res = await setBranchStatusAction(branchId, status)
      if (!res.success) throw new Error(res.error)
      setBranches((prev) =>
        prev.map((b) => (b.id === branchId ? (res.data as BranchMasterRecord) : b))
      )
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Branches & Factories / শাখা ও কারখানা সমূহ
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage physical outlets, production factory floors, regional hubs, and manager assignments
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
          >
            + Add New Branch
          </button>
        )}
      </div>

      {/* Branches Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Branch Code & Name</th>
                <th className="px-6 py-3.5">Bangla Name</th>
                <th className="px-6 py-3.5">Location & Area</th>
                <th className="px-6 py-3.5">Manager</th>
                <th className="px-6 py-3.5">Contact</th>
                <th className="px-6 py-3.5">Status</th>
                {canManage && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {b.name}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded font-mono font-bold">
                        {b.code}
                      </span>
                      {b.is_main && (
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs rounded-full font-semibold">
                          Main HQ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                    {b.name_bn || '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {b.area ? `${b.area}, ` : ''}
                    {b.address || b.full_address || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {b.manager_name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {b.phone ? <div>📞 {b.phone}</div> : null}
                    {b.email ? <div>✉️ {b.email}</div> : null}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : b.status === 'suspended'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(b)}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        Edit
                      </button>
                      {!b.is_main && (
                        <button
                          onClick={() =>
                            handleStatusChange(
                              b.id,
                              b.status === 'active' ? 'inactive' : 'active'
                            )
                          }
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        >
                          {b.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingBranch ? 'Edit Branch' : 'Create New Branch'}
            </h3>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Gazipur Factory"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Code (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. GAZ"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bangla Name / বাংলা নাম
                  </label>
                  <input
                    type="text"
                    value={formData.name_bn}
                    onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                    placeholder="যেমন: গাজীপুর কারখানা"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    placeholder="e.g. Rafiqul Islam"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="branch@company.com"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Area / Commercial Hub
                </label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="e.g. Motijheel, Tongi, Anderkilla"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Street Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Building, Floor..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_main"
                  checked={formData.is_main}
                  onChange={(e) => setFormData({ ...formData, is_main: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_main" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Set as Main Company Headquarters (HQ)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

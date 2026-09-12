'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  QrCode,
  MapPin,
  Plus,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit,
  Check,
  X,
  Compass,
  Building,
  Download,
  Search,
  Eye,
  Ban,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { QRCodeSVG } from '@/components/attendance/qr-code-svg'
import { PrintableQrPoster } from '@/components/attendance/printable-qr-poster'
import {
  getAttendanceLocationsAction,
  createAttendanceLocationAction,
  updateAttendanceLocationAction,
  deleteAttendanceLocationAction,
  regenerateLocationQrAction,
  revokeLocationQrAction,
  getAttendanceCorrectionsAction,
  reviewAttendanceCorrectionAction,
  getAttendanceAuditLogsAction,
  getTenantBranchesForAttendanceAction,
} from '@/actions/attendance.actions'
import {
  AttendanceLocationRecord,
  AttendanceCorrectionRecord,
  AttendanceAuditLogRecord,
} from '@/types/attendance.types'

export default function AttendanceSettingsPage() {
  const params = useParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [activeTab, setActiveTab] = useState<'locations' | 'qr_management' | 'corrections' | 'audit'>('locations')
  const [locations, setLocations] = useState<AttendanceLocationRecord[]>([])
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string; is_main?: boolean }>>([])
  const [corrections, setCorrections] = useState<AttendanceCorrectionRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLogRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [correctionFilter, setCorrectionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [auditFilter, setAuditFilter] = useState<string>('all')

  // Modals
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false)
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false)
  const [isQrDetailOpen, setIsQrDetailOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<AttendanceLocationRecord | null>(null)
  const [isPrintPosterOpen, setIsPrintPosterOpen] = useState(false)
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false)
  const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false)
  const [isDeleteLocationConfirmOpen, setIsDeleteLocationConfirmOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<AttendanceLocationRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Location Form State
  const [locName, setLocName] = useState('')
  const [locBranchId, setLocBranchId] = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [locLat, setLocLat] = useState<number>(0)
  const [locLng, setLocLng] = useState<number>(0)
  const [locRadius, setLocRadius] = useState<number>(100)
  const [locMaxAccuracy, setLocMaxAccuracy] = useState<number>(100)
  const [locActive, setLocActive] = useState(true)
  const [isDetectingGps, setIsDetectingGps] = useState(false)

  // Review Correction State
  const [selectedCorrection, setSelectedCorrection] = useState<AttendanceCorrectionRecord | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const locRes = await getAttendanceLocationsAction(company?.id)
      if (locRes.success && locRes.data) {
        setLocations(locRes.data)
      }

      if (company?.id) {
        const branchRes = await getTenantBranchesForAttendanceAction(company.id)
        if (branchRes.success && branchRes.data) {
          setBranches(branchRes.data)
        }

        const corrRes = await getAttendanceCorrectionsAction(company.id)
        if (corrRes.success && corrRes.data) {
          setCorrections(corrRes.data)
        }

        const auditRes = await getAttendanceAuditLogsAction(company.id)
        if (auditRes.success && auditRes.data) {
          setAuditLogs(auditRes.data)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [company?.id])

  // Detect GPS Coordinates via Browser
  const detectCurrentGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showNotification('error', 'Geolocation is not supported by your browser.')
      return
    }

    setIsDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocLat(pos.coords.latitude)
        setLocLng(pos.coords.longitude)
        setLocMaxAccuracy(Math.max(50, Math.round(pos.coords.accuracy * 1.5)))
        setIsDetectingGps(false)
        showNotification('success', `GPS coordinates captured (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`)
      },
      (err) => {
        setIsDetectingGps(false)
        showNotification('error', 'Failed to detect GPS: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle Create Location
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locName.trim() || !company) return

    if (!locLat || !locLng || isNaN(locLat) || isNaN(locLng) || locLat === 0 || locLng === 0) {
      showNotification('error', 'Please capture or enter valid GPS coordinates (Latitude & Longitude).')
      return
    }

    if (locLat < -90 || locLat > 90 || locLng < -180 || locLng > 180) {
      showNotification('error', 'Invalid GPS coordinates. Latitude must be -90 to +90, Longitude -180 to +180.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createAttendanceLocationAction({
        company_id: company.id,
        branch_id: locBranchId || undefined,
        name: locName.trim(),
        address: locAddress.trim() || null,
        latitude: locLat,
        longitude: locLng,
        radius_meters: locRadius,
        max_accuracy_meters: locMaxAccuracy,
        is_active: locActive,
      })

      if (res.success && res.data) {
        showNotification('success', `Location "${res.data.location.name}" created with active QR token.`)
        setIsAddLocationOpen(false)
        resetLocationForm()
        loadAllData()
      } else {
        showNotification('error', res.error || 'Failed to create location.')
      }
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Update Location
  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation || !company) return

    setIsSubmitting(true)
    try {
      const res = await updateAttendanceLocationAction(
        selectedLocation.id,
        {
          name: locName.trim(),
          branch_id: locBranchId || undefined,
          address: locAddress.trim() || null,
          latitude: locLat,
          longitude: locLng,
          radius_meters: locRadius,
          max_accuracy_meters: locMaxAccuracy,
          is_active: locActive,
        },
        company.id
      )

      if (res.success) {
        showNotification('success', 'Location updated successfully.')
        setIsEditLocationOpen(false)
        loadAllData()
      } else {
        showNotification('error', res.error || 'Failed to update location.')
      }
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Location Confirmation
  const openDeleteConfirm = (loc: AttendanceLocationRecord) => {
    setLocationToDelete(loc)
    setIsDeleteLocationConfirmOpen(true)
  }

  const handleConfirmDeleteLocation = async () => {
    if (!locationToDelete || !company) return

    setIsSubmitting(true)
    try {
      const res = await deleteAttendanceLocationAction(locationToDelete.id, company.id)
      if (res.success) {
        showNotification('success', `Location "${locationToDelete.name}" and QR terminal deleted.`)
        setIsDeleteLocationConfirmOpen(false)
        setLocationToDelete(null)
        setIsQrDetailOpen(false)
        loadAllData()
      } else {
        showNotification('error', res.error || 'Failed to delete location.')
      }
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle QR Regeneration
  const handleRegenerateQr = async () => {
    if (!selectedLocation || !company) return

    setIsSubmitting(true)
    try {
      const res = await regenerateLocationQrAction(selectedLocation.id, company.id)
      if (res.success && res.data) {
        showNotification('success', `New QR code generated! Previous QR code has been invalidated immediately.`)
        setIsRegenerateConfirmOpen(false)
        setIsQrDetailOpen(false)
        loadAllData()
      } else {
        showNotification('error', res.error || 'Failed to regenerate QR code.')
      }
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle QR Revocation
  const handleRevokeQr = async () => {
    if (!selectedLocation || !company) return

    setIsSubmitting(true)
    try {
      const res = await revokeLocationQrAction(selectedLocation.id, company.id)
      if (res.success) {
        showNotification('success', `QR code for "${selectedLocation.name}" has been revoked and deactivated.`)
        setIsRevokeConfirmOpen(false)
        setIsQrDetailOpen(false)
        loadAllData()
      } else {
        showNotification('error', res.error || 'Failed to revoke QR code.')
      }
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Direct Download QR as SVG
  const handleDownloadQrSvg = (loc: AttendanceLocationRecord) => {
    const activeToken = loc.active_qr_token
    const qrValue = activeToken?.raw_token
      ? `INKFLOW:ATT:v1:${activeToken.raw_token}`
      : `INKFLOW:ATT:LOC:${loc.id}`

    // Create a temporary SVG element to serialize
    const container = document.getElementById(`qr-container-${loc.id}`)
    const svgElement = container?.querySelector('svg')

    if (!svgElement) {
      showNotification('error', 'Unable to locate QR vector for download.')
      return
    }

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${loc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-qr.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showNotification('success', `Vector QR downloaded: ${link.download}`)
  }

  // Handle Review Correction
  const handleReviewCorrection = async (status: 'approved' | 'rejected') => {
    if (!selectedCorrection || !company) return

    setIsSubmitting(true)
    try {
      const res = await reviewAttendanceCorrectionAction({
        id: selectedCorrection.id,
        status,
        reviewNotes,
        companyId: company.id,
      })

      if (res.success) {
        showNotification('success', `Correction request ${status}.`)
        setSelectedCorrection(null)
        setReviewNotes('')
        loadAllData()
      } else {
        showNotification('error', res.error || 'Failed to review correction.')
      }
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetLocationForm = () => {
    setLocName('')
    setLocBranchId('')
    setLocAddress('')
    setLocLat(0)
    setLocLng(0)
    setLocRadius(100)
    setLocMaxAccuracy(100)
    setLocActive(true)
  }

  const openEditModal = (loc: AttendanceLocationRecord) => {
    setSelectedLocation(loc)
    setLocName(loc.name)
    setLocBranchId(loc.branch_id || '')
    setLocAddress(loc.address || '')
    setLocLat(loc.latitude)
    setLocLng(loc.longitude)
    setLocRadius(loc.radius_meters)
    setLocMaxAccuracy(loc.max_accuracy_meters)
    setLocActive(loc.is_active)
    setIsEditLocationOpen(true)
  }

  const openQrDetailModal = (loc: AttendanceLocationRecord) => {
    setSelectedLocation(loc)
    setIsQrDetailOpen(true)
  }

  // Filtered Locations
  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesBranch = selectedBranchFilter === 'all' || loc.branch_id === selectedBranchFilter
    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'active' && loc.is_active) ||
      (selectedStatusFilter === 'disabled' && !loc.is_active)

    return matchesSearch && matchesBranch && matchesStatus
  })

  // Filtered Corrections
  const filteredCorrections = corrections.filter((c) => {
    if (correctionFilter === 'all') return true
    return c.status === correctionFilter
  })

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilter === 'all') return true
    return log.action_type.toLowerCase().includes(auditFilter.toLowerCase())
  })

  // Quick Stats
  const activeLocationsCount = locations.filter((l) => l.is_active).length
  const activeQrCount = locations.filter((l) => l.active_qr_token && l.active_qr_token.is_active).length
  const pendingCorrectionsCount = corrections.filter((c) => c.status === 'pending').length

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Settings Navigation Bar */}
      <SettingsNav />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            <QrCode className="h-3.5 w-3.5" />
            <span>{tBilingual('Attendance & QR Engine', 'কর্মস্থল লোকেশন ও কিউআর ব্যবস্থাপনা')}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Workforce Locations & Geofence QR
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Configure physical workplace GPS boundaries, generate rotatable cryptographic QR tokens, and print on-site entrance posters.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            resetLocationForm()
            setIsAddLocationOpen(true)
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-10 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="h-4 w-4" />
          <span>Add Location (নতুন লোকেশন)</span>
        </Button>
      </div>

      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Locations</span>
          <p className="text-2xl font-black text-white font-mono">{locations.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Active Geofences</span>
          <p className="text-2xl font-black text-emerald-300 font-mono">{activeLocationsCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Rotatable QR Tokens</span>
          <p className="text-2xl font-black text-indigo-300 font-mono">{activeQrCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Pending Corrections</span>
          <p className="text-2xl font-black text-amber-300 font-mono">{pendingCorrectionsCount}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'locations'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Attendance Locations ({locations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr_management')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'qr_management'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>QR Management & Posters</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('corrections')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'corrections'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Correction Requests</span>
          {pendingCorrectionsCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
              {pendingCorrectionsCount}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit History ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: LOCATIONS & GEOFENCES */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations or addresses..."
                className="pl-9 bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Branch Filter */}
              {branches.length > 0 && (
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 h-9"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 h-9"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
          </div>

          {/* Locations Grid */}
          {filteredLocations.length === 0 ? (
            <Card className="border-slate-800 bg-slate-950 p-12 text-center space-y-3">
              <MapPin className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Attendance Locations Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || selectedBranchFilter !== 'all' || selectedStatusFilter !== 'all'
                  ? 'No locations match your filter criteria.'
                  : 'Create your first workplace geofence (e.g. Head Office, Printing Press Floor, Warehouse, or Job Site).'}
              </p>
              <Button
                type="button"
                onClick={() => {
                  resetLocationForm()
                  setIsAddLocationOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 rounded-xl"
              >
                Create Location
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLocations.map((loc) => {
                const activeToken = loc.active_qr_token
                const qrValue = activeToken?.raw_token
                  ? `INKFLOW:ATT:v1:${activeToken.raw_token}`
                  : `INKFLOW:ATT:LOC:${loc.id}`

                return (
                  <Card key={loc.id} className="border-slate-800 bg-slate-950 shadow-md overflow-hidden flex flex-col justify-between">
                    <CardHeader className="p-5 pb-3 border-b border-slate-800/60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base text-white font-bold">{loc.name}</CardTitle>
                            <Badge
                              className={`text-[10px] font-bold ${
                                loc.is_active
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {loc.is_active ? 'Active Geofence' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            {loc.branch_name && (
                              <Badge variant="outline" className="bg-slate-900 text-indigo-300 border-slate-700 text-[10px] px-1.5 py-0 flex items-center gap-1">
                                <Building className="h-2.5 w-2.5" />
                                <span>{loc.branch_name}</span>
                              </Badge>
                            )}
                            {loc.address && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                                <span>{loc.address}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(loc)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                            title="Edit Location"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(loc)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Delete Location & QR Terminal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* QR Preview & Specs */}
                      <div className="flex items-center gap-4 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <div
                          id={`qr-container-${loc.id}`}
                          onClick={() => openQrDetailModal(loc)}
                          className="p-2 bg-white rounded-lg shrink-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                          title="Click to view QR details"
                        >
                          <QRCodeSVG value={qrValue} size={84} includeMargin={false} />
                        </div>

                        <div className="space-y-1 text-xs flex-1">
                          <div className="flex justify-between text-slate-400">
                            <span>GPS Center:</span>
                            <span className="font-mono text-white font-semibold">
                              {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Radius Geofence:</span>
                            <span className="font-semibold text-indigo-300 font-mono">{loc.radius_meters}m</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Max Accuracy:</span>
                            <span className="font-mono text-slate-300">±{loc.max_accuracy_meters}m</span>
                          </div>
                          <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                            <span>Token Status:</span>
                            <span className="font-mono text-[11px] text-emerald-400 font-bold">
                              {activeToken?.token_prefix || 'ACTIVE'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedLocation(loc)
                            setIsPrintPosterOpen(true)
                          }}
                          className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-[11px] h-9 rounded-xl font-bold flex items-center justify-center gap-1"
                        >
                          <Printer className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Poster</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDownloadQrSvg(loc)}
                          className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-[11px] h-9 rounded-xl font-bold flex items-center justify-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Vector</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            setSelectedLocation(loc)
                            setIsRegenerateConfirmOpen(true)
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 text-[11px] h-9 rounded-xl font-bold flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                          <span>Rotate</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEDICATED QR MANAGEMENT */}
      {activeTab === 'qr_management' && (
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="p-5 pb-3 border-b border-slate-800">
            <CardTitle className="text-white text-base">QR Codes & Physical Terminal Management</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Audit active tokens, generate printable A4 posters, or instantly revoke compromised QR codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800">
            {locations.map((loc) => {
              const activeToken = loc.active_qr_token
              const qrValue = activeToken?.raw_token
                ? `INKFLOW:ATT:v1:${activeToken.raw_token}`
                : `INKFLOW:ATT:LOC:${loc.id}`

              return (
                <div key={loc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      id={`qr-container-${loc.id}`}
                      className="p-2 bg-white rounded-xl shrink-0 shadow-md"
                    >
                      <QRCodeSVG value={qrValue} size={76} includeMargin={false} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{loc.name}</span>
                        <Badge className="text-[10px] bg-emerald-950 text-emerald-300 border-emerald-800">
                          {activeToken?.is_active ? 'ACTIVE TOKEN' : 'INACTIVE'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Prefix: <strong className="text-indigo-300">{activeToken?.token_prefix || 'ACTIVE'}</strong> • Radius: {loc.radius_meters}m • Accuracy: ±{loc.max_accuracy_meters}m
                      </p>
                      {activeToken?.created_at && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          Last Rotated: {new Date(activeToken.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openQrDetailModal(loc)}
                      className="border-slate-700 bg-slate-900 text-slate-300 text-xs h-8 rounded-lg"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      Inspect
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelectedLocation(loc)
                        setIsPrintPosterOpen(true)
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 rounded-lg font-bold"
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      Print Poster
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLocation(loc)
                        setIsRegenerateConfirmOpen(true)
                      }}
                      className="border-amber-500/30 bg-slate-900 text-amber-300 hover:bg-slate-800 text-xs h-8 rounded-lg font-bold"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1 text-amber-400" />
                      Regenerate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLocation(loc)
                        setIsRevokeConfirmOpen(true)
                      }}
                      className="border-rose-500/30 bg-slate-900 text-rose-400 hover:bg-slate-800 text-xs h-8 rounded-lg font-bold"
                    >
                      <Ban className="h-3.5 w-3.5 mr-1 text-rose-400" />
                      Revoke
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteConfirm(loc)}
                      className="border-rose-500/30 bg-slate-900 text-rose-400 hover:bg-rose-950/40 text-xs h-8 rounded-lg font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 text-rose-400" />
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: CORRECTION REQUESTS */}
      {activeTab === 'corrections' && (
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="p-5 pb-3 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white text-base">Employee Attendance Corrections Inbox</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Review and approve/reject missed punch corrections submitted by employees.
                </CardDescription>
              </div>

              <select
                value={correctionFilter}
                onChange={(e) => setCorrectionFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 h-8 self-start sm:self-auto"
              >
                <option value="all">All Corrections</option>
                <option value="pending">Pending Only</option>
                <option value="approved">Approved Only</option>
                <option value="rejected">Rejected Only</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800">
            {filteredCorrections.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No correction requests found.
              </div>
            ) : (
              filteredCorrections.map((corr) => (
                <div key={corr.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{corr.employee_name || 'Staff'}</span>
                      <Badge className="text-[10px] bg-slate-900 text-indigo-300 border-slate-700">
                        {corr.requested_type}
                      </Badge>
                      <span className="text-xs text-slate-400">{corr.attendance_date} at {corr.requested_time}</span>
                      <Badge
                        className={`text-[10px] ${
                          corr.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : corr.status === 'rejected'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {corr.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300">
                      Reason: <strong className="text-slate-200">{corr.reason}</strong>
                    </p>
                  </div>

                  {corr.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedCorrection(corr)
                          handleReviewCorrection('approved')
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 rounded-lg font-bold"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCorrection(corr)
                          handleReviewCorrection('rejected')
                        }}
                        className="border-slate-700 bg-slate-900 text-rose-400 hover:bg-slate-800 text-xs h-8 rounded-lg font-bold"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="p-5 pb-3 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white text-base">Authoritative Attendance Audit Trail</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Immutable cryptographic ledger of all location setups, QR token rotations, and punch events.
                </CardDescription>
              </div>

              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 h-8 self-start sm:self-auto"
              >
                <option value="all">All Actions</option>
                <option value="location">Location Events</option>
                <option value="qr">QR Rotations</option>
                <option value="attendance">Punch Events</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No audit entries matching filter.
              </div>
            ) : (
              filteredAuditLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-900 text-indigo-300 border-slate-700">
                        {log.action_type}
                      </Badge>
                      <span className="font-semibold text-white">{log.actor_name}</span>
                      {log.location_name && (
                        <span className="text-slate-400">• Location: {log.location_name}</span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px] block font-mono">
                      {JSON.stringify(log.details)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* CREATE LOCATION MODAL */}
      <ModalDialog
        open={isAddLocationOpen}
        onOpenChange={(v) => !v && setIsAddLocationOpen(false)}
        title="Add New Attendance Location"
        description="Configure a physical workplace with geofence radius and GPS coordinates."
      >
        <form onSubmit={handleCreateLocation} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="locName" className="text-xs font-semibold text-slate-300">Location Name (নাম)</Label>
            <Input
              id="locName"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g. Head Office / Fakirapool Press Zone / Gazipur Warehouse"
              className="bg-slate-900 border-slate-700 text-white text-xs h-10"
              required
            />
          </div>

          {/* Branch Selection Dropdown */}
          {branches.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="locBranch" className="text-xs font-semibold text-slate-300">Assign to Branch (শাখা)</Label>
              <select
                id="locBranch"
                value={locBranchId}
                onChange={(e) => setLocBranchId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-md px-3 h-10"
              >
                <option value="">Default Company Location (All Branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="locAddress" className="text-xs font-semibold text-slate-300">Address (ঠিকানা)</Label>
            <Input
              id="locAddress"
              value={locAddress}
              onChange={(e) => setLocAddress(e.target.value)}
              placeholder="e.g. Motijheel C/A, Dhaka"
              className="bg-slate-900 border-slate-700 text-white text-xs h-10"
            />
          </div>

          {/* GPS Coordinate Inputs & Auto-detect Button */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-indigo-400" />
                <span>Geofence Coordinates</span>
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectCurrentGps}
                isLoading={isDetectingGps}
                className="h-7 text-[11px] bg-slate-800 border-indigo-500/40 text-indigo-300 hover:bg-slate-700"
              >
                Capture Current GPS
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="locLat" className="text-[11px] text-slate-400">Latitude (°N)</Label>
                <Input
                  id="locLat"
                  type="number"
                  step="0.000001"
                  value={locLat}
                  onChange={(e) => setLocLat(parseFloat(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="locLng" className="text-[11px] text-slate-400">Longitude (°E)</Label>
                <Input
                  id="locLng"
                  type="number"
                  step="0.000001"
                  value={locLng}
                  onChange={(e) => setLocLng(parseFloat(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs h-9"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sliders with Explanations */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="locRadius" className="text-xs font-semibold text-slate-300">Radius: {locRadius}m</Label>
              </div>
              <input
                id="locRadius"
                type="range"
                min={20}
                max={500}
                step={10}
                value={locRadius}
                onChange={(e) => setLocRadius(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-[10px] text-slate-400">Employees must be within this circle.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="locAcc" className="text-xs font-semibold text-slate-300">Max Accuracy: ±{locMaxAccuracy}m</Label>
              </div>
              <input
                id="locAcc"
                type="range"
                min={20}
                max={250}
                step={10}
                value={locMaxAccuracy}
                onChange={(e) => setLocMaxAccuracy(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-[10px] text-slate-400">Rejects poor GPS satellite signals.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddLocationOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              Create Location & Generate QR
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT LOCATION MODAL */}
      <ModalDialog
        open={isEditLocationOpen}
        onOpenChange={(v) => !v && setIsEditLocationOpen(false)}
        title="Edit Attendance Location"
        description="Update location details and geofence parameters."
      >
        <form onSubmit={handleUpdateLocation} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="editName" className="text-xs font-semibold text-slate-300">Location Name</Label>
            <Input
              id="editName"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-10"
              required
            />
          </div>

          {branches.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="editBranch" className="text-xs font-semibold text-slate-300">Branch</Label>
              <select
                id="editBranch"
                value={locBranchId}
                onChange={(e) => setLocBranchId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-md px-3 h-10"
              >
                <option value="">Default Company Location (All Branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="editAddress" className="text-xs font-semibold text-slate-300">Address</Label>
            <Input
              id="editAddress"
              value={locAddress}
              onChange={(e) => setLocAddress(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400">Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={locLat}
                onChange={(e) => setLocLat(parseFloat(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400">Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={locLng}
                onChange={(e) => setLocLng(parseFloat(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Radius: {locRadius}m</Label>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={locRadius}
                onChange={(e) => setLocRadius(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Max Accuracy: ±{locMaxAccuracy}m</Label>
              <input
                type="range"
                min={20}
                max={250}
                step={10}
                value={locMaxAccuracy}
                onChange={(e) => setLocMaxAccuracy(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="locActive"
              checked={locActive}
              onChange={(e) => setLocActive(e.target.checked)}
              className="rounded accent-indigo-600"
            />
            <Label htmlFor="locActive" className="text-xs cursor-pointer text-slate-300">Active Geofence Location</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditLocationOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* QR DETAIL / INSPECT MODAL */}
      {selectedLocation && (
        <ModalDialog
          open={isQrDetailOpen}
          onOpenChange={(v) => !v && setIsQrDetailOpen(false)}
          title={`Terminal QR: ${selectedLocation.name}`}
          description="Detailed cryptographic token metadata and terminal actions"
        >
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div
                id={`qr-container-${selectedLocation.id}`}
                className="p-3 bg-white rounded-xl shadow-md shrink-0"
              >
                <QRCodeSVG
                  value={
                    selectedLocation.active_qr_token?.raw_token
                      ? `INKFLOW:ATT:v1:${selectedLocation.active_qr_token.raw_token}`
                      : `INKFLOW:ATT:LOC:${selectedLocation.id}`
                  }
                  size={120}
                  includeMargin={false}
                />
              </div>

              <div className="space-y-1.5 text-xs flex-1 w-full">
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Token Status:</span>
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                    {selectedLocation.active_qr_token?.is_active ? 'ACTIVE & VERIFIED' : 'REVOKED'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Token Prefix:</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {selectedLocation.active_qr_token?.token_prefix || 'ACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Geofence Center:</span>
                  <span className="font-mono text-slate-300">
                    {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Radius & Tolerance:</span>
                  <span className="font-mono text-slate-300">
                    {selectedLocation.radius_meters}m (Max: ±{selectedLocation.max_accuracy_meters}m)
                  </span>
                </div>
                {selectedLocation.active_qr_token?.created_at && (
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-500 text-[11px]">
                    <span>Generated:</span>
                    <span>{new Date(selectedLocation.active_qr_token.created_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsQrDetailOpen(false)
                  setIsPrintPosterOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print Poster
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownloadQrSvg(selectedLocation)}
                className="border-slate-700 bg-slate-900 text-emerald-400 hover:bg-slate-800 text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsQrDetailOpen(false)
                  setIsRegenerateConfirmOpen(true)
                }}
                className="border-amber-500/30 bg-slate-900 text-amber-300 hover:bg-slate-800 text-xs font-bold"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Rotate
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsQrDetailOpen(false)
                  setIsRevokeConfirmOpen(true)
                }}
                className="border-rose-500/30 bg-slate-900 text-rose-400 hover:bg-slate-800 text-xs font-bold"
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                Revoke
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsQrDetailOpen(false)
                  openDeleteConfirm(selectedLocation)
                }}
                className="border-rose-500/40 bg-slate-900 text-rose-400 hover:bg-rose-950/50 text-xs font-bold"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* REGENERATE QR CONFIRMATION MODAL */}
      <ModalDialog
        open={isRegenerateConfirmOpen}
        onOpenChange={(v) => !v && setIsRegenerateConfirmOpen(false)}
        title="Regenerate QR Code?"
        description="Immediate cryptographic invalidation warning"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white">Warning: Immediate Invalidation</h4>
              <p>
                Regenerating this QR will <strong>immediately invalidate the previous QR code</strong>. Employees scanning the old printed QR code will be rejected. You must print and post the new QR code.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-400">
            Target Location: <strong className="text-white">{selectedLocation?.name}</strong>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRegenerateConfirmOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleRegenerateQr}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
            >
              Confirm & Invalidate Previous QR
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* REVOKE QR CONFIRMATION MODAL */}
      <ModalDialog
        open={isRevokeConfirmOpen}
        onOpenChange={(v) => !v && setIsRevokeConfirmOpen(false)}
        title="Revoke QR Code?"
        description="Deactivates terminal until newly generated"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white">Warning: Terminal Deactivation</h4>
              <p>
                Revoking this QR code will immediately disable scanning at <strong>{selectedLocation?.name}</strong>. Employees will not be able to punch attendance until a new QR is generated.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRevokeConfirmOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleRevokeQr}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Confirm Revocation
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* DELETE LOCATION & QR CONFIRMATION MODAL */}
      <ModalDialog
        open={isDeleteLocationConfirmOpen}
        onOpenChange={(v) => !v && setIsDeleteLocationConfirmOpen(false)}
        title={tBilingual('Delete Location & QR Terminal?', 'লোকেশন ও কিউআর টার্মিনাল মুছবেন?')}
        description={tBilingual(
          'Permanent deletion of physical location and cryptographic QR token',
          'লোকেশন এবং সংশ্লিষ্ট সকল কিউআর টোকেন স্থায়ীভাবে মুছে ফেলা হবে'
        )}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-white">Permanent Deletion Warning (স্থায়ীভাবে মুছে ফেলা)</h4>
              <p>
                Deleting <strong>&ldquo;{locationToDelete?.name}&rdquo;</strong> will permanently remove this location and immediately deactivate all associated QR codes. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-400 font-mono">
            Target Location: <strong className="text-white">{locationToDelete?.name}</strong> • Prefix:{' '}
            <strong className="text-indigo-300">
              {locationToDelete?.active_qr_token?.token_prefix || 'ACTIVE'}
            </strong>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteLocationConfirmOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel (বাতিল)
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleConfirmDeleteLocation}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Confirm Delete (মুছে ফেলুন)
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* PRINT POSTER MODAL */}
      {selectedLocation && (
        <ModalDialog
          open={isPrintPosterOpen}
          onOpenChange={(v) => !v && setIsPrintPosterOpen(false)}
          title="Printable QR Code Poster"
          description="High-resolution poster for on-site attendance entrance"
        >
          <PrintableQrPoster
            location={selectedLocation}
            companyName={company?.name || 'InkFlow Printing ERP'}
            companyNameBn={company?.name_bn}
            logoUrl={company?.logo_url}
            onClose={() => setIsPrintPosterOpen(false)}
          />
        </ModalDialog>
      )}
    </div>
  )
}

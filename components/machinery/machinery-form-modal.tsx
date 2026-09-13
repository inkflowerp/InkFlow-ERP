'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MachineryRecord,
  MachineryType,
  MachineryCategory,
  MachineryDepartment,
  DimensionUnit,
} from '@/types/machinery.types'
import {
  createMachineryAction,
  updateMachineryAction,
} from '@/actions/machinery.actions'
import { AlertCircle, Cpu, Sliders, DollarSign } from 'lucide-react'

const MACHINE_TYPES: { value: MachineryType; label: string }[] = [
  { value: 'digital_printing', label: 'Digital Press (Konica / Xerox / Ricoh)' },
  { value: 'large_format_printing', label: 'Large-Format Solvent / Latex / UV' },
  { value: 'uv_flatbed', label: 'UV Flatbed (Acrylic, Wood, Metal)' },
  { value: 'eco_solvent', label: 'Eco-Solvent Vinyl / Banner' },
  { value: 'sublimation', label: 'Sublimation / Apparel Heat Press' },
  { value: 'dtf_dtg', label: 'DTF / DTG Direct-to-Garment' },
  { value: 'offset_printing', label: 'Offset Sheetfed / Web Press' },
  { value: 'cutting_plotter', label: 'Sticker / Vinyl Cutting Plotter' },
  { value: 'laser_cutting', label: 'CO2 / Fiber Laser Cutter' },
  { value: 'cnc_router', label: 'CNC Router (Wood / ACP / Foam)' },
  { value: 'engraving', label: 'Rotary / Laser Engraver' },
  { value: 'acrylic_fabrication', label: 'Acrylic Bending / Flame Polisher' },
  { value: 'metal_fabrication', label: 'Metal Fabrication & Sheet Bender' },
  { value: 'welding', label: 'MIG / TIG Welding Station' },
  { value: 'laminating', label: 'Cold / Thermal Roll Laminator' },
  { value: 'binding', label: 'Book Binding / Perfect Binder' },
  { value: 'finishing', label: 'Eyelet / Creasing / Die-Punch' },
  { value: 'installation', label: 'Scaffolding / Boom Lift / Sign Rigging' },
  { value: 'other', label: 'Other Equipment' },
]

const CATEGORIES: { value: MachineryCategory; label: string }[] = [
  { value: 'printing', label: 'Printing Press' },
  { value: 'cutting_cnc', label: 'Cutting & CNC' },
  { value: 'fabrication', label: 'Metal & Acrylic Fab' },
  { value: 'finishing', label: 'Post-Press & Finishing' },
  { value: 'installation', label: 'Installation Rig' },
  { value: 'other', label: 'General Production' },
]

const DEPARTMENTS: { value: MachineryDepartment; label: string }[] = [
  { value: 'printing', label: 'Printing Floor' },
  { value: 'finishing', label: 'Finishing & Binding' },
  { value: 'fabrication', label: 'Fabrication Workshop' },
  { value: 'design', label: 'Design & Pre-Press' },
  { value: 'installation', label: 'Installation Fleet' },
  { value: 'other', label: 'General Floor' },
]

interface MachineryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machinery?: MachineryRecord | null
  onSuccess?: (machine: MachineryRecord) => void
}

export function MachineryFormModal({
  open,
  onOpenChange,
  machinery,
  onSuccess,
}: MachineryFormModalProps) {
  const isEdit = Boolean(machinery?.id)
  const [activeTab, setActiveTab] = useState<'basic' | 'production' | 'costing'>('basic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Basic Info Form State
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [machineType, setMachineType] = useState<MachineryType>('large_format_printing')
  const [category, setCategory] = useState<MachineryCategory>('printing')
  const [department, setDepartment] = useState<MachineryDepartment>('printing')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [location, setLocation] = useState('')
  const [supplier, setSupplier] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [installationDate, setInstallationDate] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [description, setDescription] = useState('')

  // Production Specs Form State
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('inch')
  const [maxWidth, setMaxWidth] = useState<string>('')
  const [maxHeight, setMaxHeight] = useState<string>('')
  const [maxLength, setMaxLength] = useState<string>('')
  const [minWidth, setMinWidth] = useState<string>('')
  const [minHeight, setMinHeight] = useState<string>('')
  const [productionCapacity, setProductionCapacity] = useState<string>('150')
  const [capacityUnit, setCapacityUnit] = useState('sft/hour')
  const [estimatedSpeed, setEstimatedSpeed] = useState<string>('200')
  const [speedUnit, setSpeedUnit] = useState('sft/hour')
  const [setupTimeMins, setSetupTimeMins] = useState<string>('10')
  const [changeoverTimeMins, setChangeoverTimeMins] = useState<string>('5')
  const [supportedMaterials, setSupportedMaterials] = useState<string>('Panaflex, Vinyl, Backlit, Mesh, Canvas')
  const [supportedProductionTypes, setSupportedProductionTypes] = useState<string>('Eco-Solvent Print, Outdoor Banner')
  const [defaultOperatorRequirement, setDefaultOperatorRequirement] = useState('Skilled Print Operator')
  const [operatorsRequiredCount, setOperatorsRequiredCount] = useState<string>('1')

  // Costing Specs Form State
  const [purchaseCost, setPurchaseCost] = useState<string>('0')
  const [hourlyMachineCost, setHourlyMachineCost] = useState<string>('350')
  const [perUnitMachineCost, setPerUnitMachineCost] = useState<string>('2.5')
  const [electricityCostPerHour, setElectricityCostPerHour] = useState<string>('80')
  const [maintenanceCostPerHour, setMaintenanceCostPerHour] = useState<string>('40')
  const [otherOperatingCostPerHour, setOtherOperatingCostPerHour] = useState<string>('20')

  // Initialize form when opening or editing
  useEffect(() => {
    if (machinery) {
      setName(machinery.name || '')
      setCode(machinery.code || '')
      setMachineType((machinery.machine_type as MachineryType) || 'large_format_printing')
      setCategory((machinery.category as MachineryCategory) || 'printing')
      setDepartment((machinery.department as MachineryDepartment) || 'printing')
      setBrand(machinery.brand || '')
      setModel(machinery.model || '')
      setSerialNumber(machinery.serial_number || '')
      setLocation(machinery.location || '')
      setSupplier(machinery.supplier || '')
      setPurchaseDate(machinery.purchase_date || '')
      setInstallationDate(machinery.installation_date || '')
      setWarrantyExpiry(machinery.warranty_expiry || '')
      setDescription(machinery.description || '')

      setDimensionUnit((machinery.dimension_unit as DimensionUnit) || 'inch')
      setMaxWidth(machinery.max_width?.toString() || '')
      setMaxHeight(machinery.max_height?.toString() || '')
      setMaxLength(machinery.max_length?.toString() || '')
      setMinWidth(machinery.min_width?.toString() || '')
      setMinHeight(machinery.min_height?.toString() || '')
      setProductionCapacity(machinery.production_capacity?.toString() || '')
      setCapacityUnit(machinery.capacity_unit || 'sft/hour')
      setEstimatedSpeed(machinery.estimated_speed?.toString() || '')
      setSpeedUnit(machinery.speed_unit || 'sft/hour')
      setSetupTimeMins(machinery.setup_time_mins?.toString() || '0')
      setChangeoverTimeMins(machinery.changeover_time_mins?.toString() || '0')
      setSupportedMaterials((machinery.supported_materials || []).join(', '))
      setSupportedProductionTypes((machinery.supported_production_types || []).join(', '))
      setDefaultOperatorRequirement(machinery.default_operator_requirement || '')
      setOperatorsRequiredCount(machinery.operators_required_count?.toString() || '1')

      setPurchaseCost(machinery.purchase_cost?.toString() || '0')
      setHourlyMachineCost(machinery.hourly_machine_cost?.toString() || '0')
      setPerUnitMachineCost(machinery.per_unit_machine_cost?.toString() || '0')
      setElectricityCostPerHour(machinery.electricity_cost_per_hour?.toString() || '0')
      setMaintenanceCostPerHour(machinery.maintenance_cost_per_hour?.toString() || '0')
      setOtherOperatingCostPerHour(machinery.other_operating_cost_per_hour?.toString() || '0')
    } else {
      // Reset to defaults
      setName('')
      setCode('')
      setMachineType('large_format_printing')
      setCategory('printing')
      setDepartment('printing')
      setBrand('')
      setModel('')
      setSerialNumber('')
      setLocation('')
      setSupplier('')
      setPurchaseDate('')
      setInstallationDate('')
      setWarrantyExpiry('')
      setDescription('')

      setDimensionUnit('inch')
      setMaxWidth('126') // 10.5 ft standard banner width
      setMaxHeight('1000')
      setMaxLength('')
      setMinWidth('12')
      setMinHeight('12')
      setProductionCapacity('200')
      setCapacityUnit('sft/hour')
      setEstimatedSpeed('250')
      setSpeedUnit('sft/hour')
      setSetupTimeMins('10')
      setChangeoverTimeMins('5')
      setSupportedMaterials('Panaflex, Vinyl, Backlit, Mesh, Canvas')
      setSupportedProductionTypes('Eco-Solvent Print, Outdoor Banner')
      setDefaultOperatorRequirement('Skilled Print Operator')
      setOperatorsRequiredCount('1')

      setPurchaseCost('1200000')
      setHourlyMachineCost('350')
      setPerUnitMachineCost('2.5')
      setElectricityCostPerHour('80')
      setMaintenanceCostPerHour('40')
      setOtherOperatingCostPerHour('20')
    }
    setError(null)
    setActiveTab('basic')
  }, [machinery, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!name.trim()) throw new Error('Machine name is required.')
      if (!code.trim()) throw new Error('Machine code is required.')

      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        machine_type: machineType,
        category,
        department,
        brand: brand.trim() || null,
        model: model.trim() || null,
        serial_number: serialNumber.trim() || null,
        location: location.trim() || null,
        supplier: supplier.trim() || null,
        purchase_date: purchaseDate || null,
        installation_date: installationDate || null,
        warranty_expiry: warrantyExpiry || null,
        description: description.trim() || null,

        dimension_unit: dimensionUnit,
        max_width: maxWidth ? Number(maxWidth) : null,
        max_height: maxHeight ? Number(maxHeight) : null,
        max_length: maxLength ? Number(maxLength) : null,
        min_width: minWidth ? Number(minWidth) : null,
        min_height: minHeight ? Number(minHeight) : null,
        production_capacity: Number(productionCapacity) || 0,
        capacity_unit: capacityUnit.trim() || 'sft/hour',
        estimated_speed: Number(estimatedSpeed) || 0,
        speed_unit: speedUnit.trim() || 'sft/hour',
        setup_time_mins: Number(setupTimeMins) || 0,
        changeover_time_mins: Number(changeoverTimeMins) || 0,
        supported_materials: supportedMaterials
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        supported_production_types: supportedProductionTypes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        default_operator_requirement: defaultOperatorRequirement.trim() || null,
        operators_required_count: Number(operatorsRequiredCount) || 1,

        purchase_cost: Number(purchaseCost) || 0,
        hourly_machine_cost: Number(hourlyMachineCost) || 0,
        per_unit_machine_cost: Number(perUnitMachineCost) || 0,
        electricity_cost_per_hour: Number(electricityCostPerHour) || 0,
        maintenance_cost_per_hour: Number(maintenanceCostPerHour) || 0,
        other_operating_cost_per_hour: Number(otherOperatingCostPerHour) || 0,
      }

      let res
      if (isEdit && machinery?.id) {
        res = await updateMachineryAction(machinery.id, payload)
      } else {
        res = await createMachineryAction(payload)
      }

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to save machinery.')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess(res.data)
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving machinery.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit Machinery — ${machinery?.name}` : '+ Add New Machinery'}
      description="Configure machine specifications, operational limits, maintenance parameters, and costing."
      size="4xl"
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Section Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>1. Basic Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'production'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>2. Production & Dimensions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('costing')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'costing'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>3. Operating Costing</span>
          </button>
        </div>

        {/* TAB 1: BASIC INFORMATION */}
        {activeTab === 'basic' && (
          <div className="space-y-3.5 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mName" required>Machine Name</Label>
                <Input
                  id="mName"
                  placeholder="e.g. Flora Polar 3200 Solvent 10ft"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mCode" required>Machine Code / ID</Label>
                <Input
                  id="mCode"
                  placeholder="e.g. PRN-01, CNC-02, LAS-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="font-mono uppercase font-bold tracking-wider"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mType" required>Machine Type</Label>
                <select
                  id="mType"
                  value={machineType}
                  onChange={(e) => setMachineType(e.target.value as MachineryType)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  {MACHINE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mCat">Fleet Category</Label>
                <select
                  id="mCat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MachineryCategory)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mDept">Department</Label>
                <select
                  id="mDept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as MachineryDepartment)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mBrand">Brand / Manufacturer</Label>
                <Input
                  id="mBrand"
                  placeholder="e.g. Roland, Konica Minolta, Flora, Epson"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mModel">Model Number</Label>
                <Input
                  id="mModel"
                  placeholder="e.g. AccurioPress C4070, SureColor S80600"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mSerial">Serial Number</Label>
                <Input
                  id="mSerial"
                  placeholder="e.g. SN-98234-2023"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mLoc">Floor Location</Label>
                <Input
                  id="mLoc"
                  placeholder="e.g. Bay 2, Ground Floor Press Hub"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mSupp">Supplier / Vendor</Label>
                <Input
                  id="mSupp"
                  placeholder="e.g. ACI Machinery, DigiPrint BD"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mPurDate">Purchase Date</Label>
                <Input
                  id="mPurDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mWarr">Warranty Expiry Date</Label>
                <Input
                  id="mWarr"
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mDesc">Description & Notes</Label>
                <Input
                  id="mDesc"
                  placeholder="e.g. 4-head Konica 512i printhead configuration with takeup roll"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTION SPECIFICATIONS */}
        {activeTab === 'production' && (
          <div className="space-y-3.5 py-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mDimUnit">Dimension Unit</Label>
                <select
                  id="mDimUnit"
                  value={dimensionUnit}
                  onChange={(e) => setDimensionUnit(e.target.value as DimensionUnit)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="inch">Inches (in)</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="mm">Millimeters (mm)</option>
                  <option value="cm">Centimeters (cm)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mMaxW">Max Width ({dimensionUnit})</Label>
                <Input
                  id="mMaxW"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 126"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mMaxH">Max Height / Roll Length</Label>
                <Input
                  id="mMaxH"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 1800"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mMinW">Min Width ({dimensionUnit})</Label>
                <Input
                  id="mMinW"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 12"
                  value={minWidth}
                  onChange={(e) => setMinWidth(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mCap">Capacity ({capacityUnit})</Label>
                <Input
                  id="mCap"
                  type="number"
                  step="1"
                  placeholder="e.g. 200"
                  value={productionCapacity}
                  onChange={(e) => setProductionCapacity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mCapUnit">Capacity Unit</Label>
                <Input
                  id="mCapUnit"
                  placeholder="e.g. sft/hour, pcs/hour, sheets/hr"
                  value={capacityUnit}
                  onChange={(e) => setCapacityUnit(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mSpeed">Estimated Running Speed</Label>
                <Input
                  id="mSpeed"
                  type="number"
                  step="1"
                  placeholder="e.g. 250"
                  value={estimatedSpeed}
                  onChange={(e) => setEstimatedSpeed(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mSetup">Setup Time (Mins)</Label>
                <Input
                  id="mSetup"
                  type="number"
                  step="1"
                  placeholder="e.g. 10"
                  value={setupTimeMins}
                  onChange={(e) => setSetupTimeMins(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mChange">Changeover Time (Mins)</Label>
                <Input
                  id="mChange"
                  type="number"
                  step="1"
                  placeholder="e.g. 5"
                  value={changeoverTimeMins}
                  onChange={(e) => setChangeoverTimeMins(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mOps">Operators Required</Label>
                <Input
                  id="mOps"
                  type="number"
                  step="1"
                  min="1"
                  value={operatorsRequiredCount}
                  onChange={(e) => setOperatorsRequiredCount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mMats">Supported Materials (Comma separated)</Label>
              <Input
                id="mMats"
                placeholder="Panaflex 440gsm, PVC Vinyl 100mic, Backlit Film, Mesh, Canvas"
                value={supportedMaterials}
                onChange={(e) => setSupportedMaterials(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mTypes">Supported Production Types</Label>
              <Input
                id="mTypes"
                placeholder="Digital Solvent Print, Outdoor Signage, Vehicle Wrap"
                value={supportedProductionTypes}
                onChange={(e) => setSupportedProductionTypes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 3: COSTING INFORMATION */}
        {activeTab === 'costing' && (
          <div className="space-y-3.5 py-1">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
              💡 <strong>V4 Costing Readiness:</strong> Machine hourly and operating costs are used for accurate live job costing, electricity attribution, and floor profit margin auditing.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mPurCost">Purchase Cost (৳ BDT)</Label>
                <Input
                  id="mPurCost"
                  type="number"
                  step="1000"
                  placeholder="e.g. 1200000"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mHourCost">Hourly Machine Run Rate (৳/Hour)</Label>
                <Input
                  id="mHourCost"
                  type="number"
                  step="10"
                  placeholder="e.g. 350"
                  value={hourlyMachineCost}
                  onChange={(e) => setHourlyMachineCost(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mPerUnit">Per-Unit / Per-SFT Overhead (৳)</Label>
                <Input
                  id="mPerUnit"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 2.5"
                  value={perUnitMachineCost}
                  onChange={(e) => setPerUnitMachineCost(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mElec">Electricity Cost / Hour (৳)</Label>
                <Input
                  id="mElec"
                  type="number"
                  step="5"
                  placeholder="e.g. 80"
                  value={electricityCostPerHour}
                  onChange={(e) => setElectricityCostPerHour(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mMaintCost">Maintenance Buffer / Hour (৳)</Label>
                <Input
                  id="mMaintCost"
                  type="number"
                  step="5"
                  placeholder="e.g. 40"
                  value={maintenanceCostPerHour}
                  onChange={(e) => setMaintenanceCostPerHour(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mOtherCost">Other Operating Overheads (৳/Hour)</Label>
                <Input
                  id="mOtherCost"
                  type="number"
                  step="5"
                  placeholder="e.g. 20"
                  value={otherOperatingCostPerHour}
                  onChange={(e) => setOtherOperatingCostPerHour(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px]"
          >
            Cancel
          </Button>

          <div className="flex gap-2 w-full sm:w-auto">
            {activeTab !== 'costing' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'basic') setActiveTab('production')
                  else if (activeTab === 'production') setActiveTab('costing')
                }}
                className="w-full sm:w-auto min-h-[40px]"
              >
                Next Section ➔
              </Button>
            ) : null}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isEdit ? 'Save Changes' : 'Register Machine'}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}

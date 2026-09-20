const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../components/products/service-config-modal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. New handleSelectCategory and handleSelectServiceType
const newHandlers = `  // Handle selecting a category and aligning sub-category suggestions, units, pricing methods & technical defaults
  const handleSelectCategory = (catId: string) => {
    setCategory(catId)

    // Find match in SERVICE_TYPE_CATEGORIES
    const catList = SERVICE_TYPE_CATEGORIES[serviceType] || []
    const match = catList.find((c) => c.id === catId)
    if (match) {
      if (match.defaultUnit) setSellingUnit(match.defaultUnit)
      if (match.defaultMethod) setPricingMethod(match.defaultMethod)
    }

    // Auto-suggest default sub-category from CATEGORY_SUBCATEGORY_MAP
    const suggestions = CATEGORY_SUBCATEGORY_MAP[catId] || []
    if (suggestions.length > 0) {
      if (!subCategory || !suggestions.includes(subCategory)) {
        setSubCategory(suggestions[0])
      }
    } else {
      setSubCategory('')
    }

    // Align technical configuration defaults according to category
    if (catId === 'wide_format_printing') {
      setPrintCategory('Large Format Eco-Solvent Print')
      setPrintTechnology('Eco-Solvent')
      setProductionMethod('Roll-to-Roll')
      setDefaultDepartment('Digital Printing')
      setSelectedInkProfile('eco_solvent_cmyk')
      setInkType('Eco-Solvent High Pigment Ink')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'solvent_printing') {
      setPrintCategory('Solvent Heavy Duty Print (Banner & Flex)')
      setPrintTechnology('Solvent')
      setProductionMethod('Roll-to-Roll')
      setDefaultDepartment('Large Format Press')
      setSelectedInkProfile('solvent_cmyk')
      setInkType('Solvent Heavy Duty Ink')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'uv_printing') {
      setPrintCategory('UV Flatbed Rigid Direct Print')
      setPrintTechnology('UV LED')
      setProductionMethod('Flatbed Sheet')
      setDefaultDepartment('Digital Printing')
      setSelectedInkProfile('uv_cmyk_w_v')
      setInkType('UV LED Curable Ink')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'digital_print') {
      setPrintCategory('Digital Press Commercial Print')
      setPrintTechnology('Digital Toner')
      setProductionMethod('Sheet-to-Sheet')
      setDefaultDepartment('Digital Printing')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pack')
    } else if (catId === 'offset_printing') {
      setPrintCategory('Commercial Offset Packaging')
      setPrintTechnology('Offset Lithography')
      setProductionMethod('Sheetfed Offset')
      setDefaultDepartment('Offset Press')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('sheet')
    } else if (catId === 'sublimation_printing') {
      setPrintCategory('Dye Sublimation Fabric Print')
      setPrintTechnology('Dye Sublimation')
      setProductionMethod('Heat Transfer Roll')
      setDefaultDepartment('Textile Printing')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'dtf_printing') {
      setPrintCategory('DTF Apparel Transfer Print')
      setPrintTechnology('Direct to Film (DTF)')
      setProductionMethod('Roll-to-Roll Heat Press')
      setDefaultDepartment('Textile Printing')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'screen_printing') {
      setPrintCategory('Screen Printing Manual/Auto')
      setPrintTechnology('Manual Screen Mesh')
      setProductionMethod('Platen Table')
      setDefaultDepartment('Screen Printing Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'signage_fabrication') {
      setProductionCategory('Signboard & Metal Frame Fabrication (এমএস ফ্রেম সাইনবোর্ড)')
      setStructureFrameType('1" MS Square Box Pipe (20 gauge)')
      setFrameDepth('2 inch')
      setLightingType('none')
      setFabricationMethod('Welding & Metal Assembly')
      setDefaultDepartment('Metal Fabrication Workshop')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'acrylic_3d_letters') {
      setProductionCategory('3D Acrylic, SS & Neon Letters (এক্রিলিক ৩ডি লেটার)')
      setStructureFrameType('Acrylic 3mm Sheet with 2" Return Edge')
      setFrameDepth('2 inch')
      setLightingType('backlit_led')
      setFabricationMethod('Laser Cutting & Acrylic Bending')
      setDefaultDepartment('Signage & Acrylic Workshop')
      setSellingUnit('inch')
      setPricingMethod('per_length')
      setPurchaseUnit('sheet')
    } else if (catId === 'lightbox_led') {
      setProductionCategory('LED Backlit & Slim Lightboxes (লাইটবক্স ফ্রেম)')
      setStructureFrameType('Aluminum Slim Lightbox Extrusion Profile')
      setFrameDepth('4 inch')
      setLightingType('backlit_led')
      setFabricationMethod('Profile Assembly & LED Wiring')
      setDefaultDepartment('Signage & Acrylic Workshop')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('pcs')
    } else if (catId === 'cnc_wood_fabrication') {
      setProductionCategory('CNC Router & Laser Engraving (সিএনসি ও লেজার)')
      setStructureFrameType('MDF / Solid Wood / PVC Board')
      setFrameDepth('Flat (2D)')
      setFabricationMethod('CNC 3D Carving & Laser Engraving')
      setDefaultDepartment('CNC & Laser Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'display_kiosks') {
      setProductionCategory('POS Displays, Kiosks & Gondolas (ডিসপ্লে কিয়স্ক)')
      setStructureFrameType('Modular MS Frame & Acrylic Trays')
      setFrameDepth('12 inch')
      setFabricationMethod('Metal Welding & Acrylic Fabrication')
      setDefaultDepartment('Signage & Acrylic Workshop')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'event_backdrops') {
      setProductionCategory('Event Staging & Truss Structures (ইভেন্ট স্টেজ)')
      setStructureFrameType('Heavy Aluminum Truss / MS Box')
      setFrameDepth('6 inch')
      setFabricationMethod('Modular Truss Erection')
      setDefaultDepartment('Metal Fabrication Workshop')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('pcs')
    } else if (catId === 'thermal_lamination') {
      setFinishingCategory('Thermal Film Lamination (BOPP/PET)')
      setFinishingMethod('Gloss Thermal Lamination')
      setLaminationMicron('32')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'cold_lamination') {
      setFinishingCategory('Cold Pressure Sensitive Lamination')
      setFinishingMethod('Cold Film Lamination')
      setLaminationMicron('80')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'floor_anti_slip') {
      setFinishingCategory('Floor Anti-Slip & Heavy Overlaminate')
      setFinishingMethod('Textured Floor Lamination')
      setLaminationMicron('200')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'board_mounting') {
      setFinishingCategory('Rigid Board Mounting & Pasting')
      setFinishingMethod('PVC Foam Sunboard Pasting')
      setLaminationMicron('3mm')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'eyelets_grommets') {
      setFinishingCategory('Eyelets & Brass Grommets')
      setFinishingMethod('Automatic Brass Eyeletting')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('box')
    } else if (catId === 'edge_hemming') {
      setFinishingCategory('Edge Hemming & Pocket Seaming')
      setFinishingMethod('Hot Air Seaming with Rope')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('rft')
      setPricingMethod('per_length')
      setPurchaseUnit('roll')
    } else if (catId === 'die_cutting') {
      setFinishingCategory('Die-Cutting, Kiss-Cut & Creasing')
      setFinishingMethod('Flatbed Plotter Kiss-Cut')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('sheet')
    } else if (catId === 'binding_finishing') {
      setFinishingCategory('Book Binding, Spiral & Stitching')
      setFinishingMethod('Wire-O Spiral Binding')
      setDefaultDepartment('Post-Press Binding Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'spot_uv_foiling') {
      setFinishingCategory('Spot UV Varnish & Foil Stamping')
      setFinishingMethod('Digital Spot UV & Gold Foil')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('sheet')
    } else if (catId === 'site_pasting') {
      setInstallationCategory('Indoor Wall & Glass Sticker Pasting (গ্লাস ও ওয়াল পেস্টিং)')
      setInstallationHeightTier('ground')
      setInstallationCrewSize(2)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'billboard_erection') {
      setInstallationCategory('Rooftop Billboard & Highway Unipole Erection')
      setInstallationHeightTier('extreme')
      setInstallationCrewSize(4)
      setSafetyEquipmentRequired(true)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'signboard_installation') {
      setInstallationCategory('Shopfront Fascia & Building Sign Installation')
      setInstallationHeightTier('mid')
      setInstallationCrewSize(2)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'vehicle_branding') {
      setInstallationCategory('Commercial Vehicle Full Body Branding & Wrap')
      setInstallationHeightTier('ground')
      setInstallationCrewSize(2)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'exhibition_setup') {
      setInstallationCategory('Exhibition Fair Stall & Stage Fitting')
      setInstallationHeightTier('mid')
      setInstallationCrewSize(3)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'local_city_delivery') {
      setDeliveryCategory('Local City Van / Bike Delivery (সিটি ডেলিভারি)')
      setDeliveryVehicleType('pickup_van')
      setDeliveryDistanceZone('inside_city')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('trip')
      setPricingMethod('per_job')
      setPurchaseUnit('trip')
    } else if (catId === 'freight_transport') {
      setDeliveryCategory('Inter-District Courier & Truck Freight (আন্তঃজেলা পরিবহন)')
      setDeliveryVehicleType('covered_truck')
      setDeliveryDistanceZone('nationwide')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('trip')
      setPricingMethod('per_job')
      setPurchaseUnit('trip')
    } else if (catId === 'express_delivery') {
      setDeliveryCategory('Express Urgent Delivery (এক্সপ্রেস ডেলিভারি)')
      setDeliveryVehicleType('motorbike')
      setDeliveryDistanceZone('inside_city')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('trip')
      setPricingMethod('per_job')
      setPurchaseUnit('trip')
    } else if (catId === 'warehouse_handling') {
      setDeliveryCategory('Packaging & Crate Boxing (প্যাকেজিং ও ক্রেট)')
      setDeliveryVehicleType('pickup_van')
      setDeliveryDistanceZone('inside_city')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'graphic_design') {
      setGeneralCategory('Graphic Design & Pre-Press Color Separation (গ্রাফিক ডিজাইন)')
      setDeliverableFormat('vector_ai_pdf')
      setTurnaroundHours(24)
      setDefaultDepartment('Creative Design Studio')
      setSellingUnit('job')
      setPricingMethod('per_job')
      setPurchaseUnit('job')
    } else if (catId === 'technical_survey') {
      setGeneralCategory('Site Measurement & Laser Survey (সাইট পরিমাপ)')
      setDeliverableFormat('site_survey_report')
      setTurnaroundHours(12)
      setDefaultDepartment('Technical Survey Team')
      setSellingUnit('job')
      setPricingMethod('per_job')
      setPurchaseUnit('job')
    } else if (catId === 'maintenance_repair') {
      setGeneralCategory('Signboard Maintenance & LED Repair (রক্ষণাবেক্ষণ)')
      setDeliverableFormat('onsite_maintenance')
      setTurnaroundHours(48)
      setDefaultDepartment('Field Operations Team')
      setSellingUnit('job')
      setPricingMethod('per_job')
      setPurchaseUnit('job')
    } else if (catId === 'custom_job_service') {
      setGeneralCategory('Custom CNC / Laser Job Work (জব ওয়ার্ক)')
      setDeliverableFormat('vector_ai_pdf')
      setTurnaroundHours(24)
      setDefaultDepartment('CNC & Laser Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    }
  }

  // Handle switching Service Type and aligning Catalog Category & default parameters
  const handleSelectServiceType = (newType: 'printing' | 'production' | 'finishing' | 'installation' | 'delivery' | 'general') => {
    setServiceType(newType)
    const availableCats = SERVICE_TYPE_CATEGORIES[newType] || []
    if (availableCats.length > 0) {
      handleSelectCategory(availableCats[0].id)
    }
  }`;

const oldHandlerMarker = '  // Handle switching Service Type and aligning Catalog Category & default parameters';
const oldHandlerEndMarker = '  // Auto calculate ink channel consumption';

const startH = content.indexOf(oldHandlerMarker);
const endH = content.indexOf(oldHandlerEndMarker, startH);
if (startH !== -1 && endH !== -1) {
  content = content.slice(0, startH) + newHandlers + '\n\n' + content.slice(endH);
} else {
  console.error('Handler markers not found!');
}

// 2. Dynamic Step 1 Panels
const step1StartMarker = '              {/* Service Type, Category & Sub-category */}';
const step1EndMarker = '            {/* 1.6 Commercial Billing & Scope */}';

const step1StartIdx = content.indexOf(step1StartMarker);
const step1EndIdx = content.indexOf(step1EndMarker, step1StartIdx);

if (step1StartIdx === -1 || step1EndIdx === -1) {
  console.error('Step 1 markers not found!', step1StartIdx, step1EndIdx);
  process.exit(1);
}

const newStep1JSX = `              {/* Service Type, Category & Sub-category */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Service Type <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={serviceType}
                      onChange={(e) => handleSelectServiceType(e.target.value as any)}
                      className="w-full h-9 text-xs rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 px-2.5 font-bold text-blue-900 dark:text-blue-200"
                    >
                      <option value="printing">🖨️ Printing & Production Service</option>
                      <option value="production">🏗️ Fabrication & Assembly</option>
                      <option value="finishing">✂️ Finishing & Lamination</option>
                      <option value="installation">🔧 Installation & Fitting</option>
                      <option value="delivery">🚚 Delivery & Logistics</option>
                      <option value="general">⚙️ General Service</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                        Category <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                        {filteredCatalogCategories.length} Options
                      </span>
                    </div>
                    <select
                      value={category}
                      onChange={(e) => handleSelectCategory(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      {filteredCatalogCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.name_bn ? \`(\${c.name_bn})\` : ''}
                        </option>
                      ))}
                      {category && !filteredCatalogCategories.some((c) => c.id === category) && (
                        <option value={category}>{category}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Sub-category (উপ-ক্যাটাগরি)
                    </Label>
                    <Input
                      list="subcat-options"
                      placeholder="e.g. Flex Printing, Rigid UV, Acrylic Letters..."
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <datalist id="subcat-options">
                      {(CATEGORY_SUBCATEGORY_MAP[category] || []).map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Sub-category Clickable Suggestions Pills */}
                {(CATEGORY_SUBCATEGORY_MAP[category] || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Suggestions:</span>
                    {(CATEGORY_SUBCATEGORY_MAP[category] || []).slice(0, 5).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSubCategory(preset)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer',
                          subCategory === preset
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DYNAMIC TECHNICAL CONFIGURATION PANEL (ADAPTS TO SERVICE TYPE)           */}
            {/* ========================================================================= */}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 1: PRINTING & PRODUCTION SERVICE                                     */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'printing' && (
              <>
                {/* 1.2 Print & Production Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/60 dark:border-blue-900/60">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Print & Production Configuration
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                      Large Format & Digital Press
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Print Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={printCategory}
                        onChange={(e) => {
                          const val = e.target.value
                          setPrintCategory(val)
                          const matched = DEFAULT_PRINT_CATEGORIES.find((c) => c.name === val)
                          if (matched) {
                            setInkType(matched.defaultInk)
                            setSelectedPrintingMethods([matched.name_bn || matched.name])
                          }
                        }}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_PRINT_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Technology (প্রযুক্তি) <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={printTechnology}
                        onChange={(e) => setPrintTechnology(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {PRINT_TECHNOLOGIES.map((tech) => (
                          <option key={tech} value={tech}>
                            {tech}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Production Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={productionMethod}
                        onChange={(e) => setProductionMethod(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {PRODUCTION_METHODS.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Machinery Fleet Pre-selection */}
                  {machineries.length > 0 && (
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-blue-600" />
                          Assigned Machinery Fleet Routing
                        </Label>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Auto-populates speed & machine cost</span>
                      </div>
                      <select
                        value={selectedMachineId}
                        onChange={(e) => handleFleetMachineSelect(e.target.value)}
                        className="w-full h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 font-medium"
                      >
                        <option value="">-- Auto-Match Best Available Machine --</option>
                        {machineries.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.code || 'NO-CODE'}) — {m.category} {m.max_print_width_inches ? \`[Max: \${m.max_print_width_inches}"]\` : ''} • Rate: ৳{m.hourly_rate_bdt || 0}/hr • Speed: {m.speed_sqft_per_hour || m.speed_sheets_per_hour || 'N/A'} {m.speed_sheets_per_hour ? 'sheets/hr' : 'sqft/hr'}
                          </option>
                        ))}
                      </select>

                      {selectedMachineId && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                          <span>Hourly Rate: <strong className="text-slate-900 dark:text-white font-mono">৳{machineHourlyRate || 0}/hr</strong></span>
                          <span>Speed: <strong className="text-blue-600 dark:text-blue-400 font-mono">{estimatedSpeed || 'Auto'} {speedUnit === 'sheet_per_hr' ? 'Sheets/hr' : 'Sqft/hr'}</strong></span>
                          <span>Unit Machine Cost: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">৳{machineCost || 0}/sft</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 1.3 Primary Substrate & Material Info Card */}
                <div className="space-y-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60 dark:border-emerald-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Primary Substrate (Raw Material Isolation)
                      </h4>
                    </div>
                    {printableMaterialId && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked (item_type = raw_material)
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Raw Material Substrate <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={printableMaterialId}
                      onChange={(e) => handleSelectPrintableMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        printableMaterialId
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Inventory Raw Material Substrate / Media --</option>
                      {substrateMaterials.map((mat) => {
                        const costStr = (mat as any).purchase_price_per_sft || (mat as any).purchase_price || (mat as any).cost_per_unit
                        return (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.unit || (mat as any).purchase_unit || 'unit'}){costStr ? \` — ৳\${costStr}/sft\` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* Substrate Details Card */}
                  {selectedMaterialRecord && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-300 dark:border-emerald-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Material / SKU</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block">{selectedMaterialRecord.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{selectedMaterialRecord.sku}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Purchase / Stock Unit</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                          {purchaseUnit} / {selectedMaterialRecord.unit || 'roll'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Roll Widths</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {availableRollWidths.join(', ')} ft
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Roll Length</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {standardRollLength} ft
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Average Cost</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{getMaterialCost(selectedMaterialRecord)} / {getMaterialUnitDetails(selectedMaterialRecord).consumeUnit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 1.4 Dimension Rules & Nesting */}
                <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Dimension Rules & Media Nesting
                      </h4>
                    </div>
                  </div>

                  {/* Supported Roll Widths Pills + Inline Add */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Supported Roll Widths (ফিট প্রস্থ)
                    </Label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {availableRollWidths.map((w) => (
                        <span
                          key={w}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 shadow-2xs"
                        >
                          <span>{w} ft</span>
                          {availableRollWidths.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRollWidth(w)}
                              className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}

                      <div className="inline-flex items-center gap-1">
                        <Input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="+ Width (ft)"
                          value={newRollWidth}
                          onChange={(e) => setNewRollWidth(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRollWidth())}
                          className="h-7 w-24 text-xs font-mono"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddRollWidth}
                          className="h-7 px-2 text-xs font-bold"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Trim, Bleed, Print Allowance & Nesting Rule */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Trim Allowance (Inches)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={trimAllowanceIn}
                          onChange={(e) => setTrimAllowanceIn(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs font-mono pr-8"
                        />
                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">in</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Production Bleed (Inches)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={productionBleedInches}
                          onChange={(e) => setProductionBleedInches(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs font-mono pr-8"
                        />
                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">in</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Print Allowance (Feet)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={extraWidthAllowance}
                          onChange={(e) => setExtraWidthAllowance(e.target.value)}
                          className="h-9 text-xs font-mono pr-8"
                        />
                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">ft</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Nesting Rule <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={nestingRule}
                        onChange={(e) => setNestingRule(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {NESTING_RULES.map((rule) => (
                          <option key={rule.value} value={rule.value}>
                            {rule.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.5 Ink Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200/60 dark:border-indigo-900/60">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Ink Configuration & Chemistry
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                      Ink Cost: <strong className="text-indigo-600 dark:text-indigo-400">৳{inkCost || 0}/sft</strong>
                    </span>
                  </div>

                  {/* Quick Ink Profile Selectors */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Ink Technology & Channel Profile
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {INK_PROFILES.map((prof) => {
                        const isSel = selectedInkProfile === prof.id
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => handleApplyInkProfile(prof.id)}
                            className={cn(
                              'p-2 rounded-lg border text-left text-xs transition-all cursor-pointer',
                              isSel
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                            )}
                          >
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {prof.name.split(' (')[0]}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {prof.channels.length} Channels ({prof.channels.map((c) => c.channel[0]).join('')})
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Ink Channels Grid with Distributed ml/sft Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Configured Channels ({selectedInks.length}) & Inventory Links
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleAddInkChannel}
                        className="h-6 px-2 text-[11px] text-indigo-600 dark:text-indigo-400"
                      >
                        + Add Custom Channel
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedInks.map((ink, idx) => {
                        const brk = autoCalculatedInkMetrics.channelsBreakdown[idx]
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-full border shrink-0"
                                  style={{ backgroundColor: ink.color_code }}
                                />
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {ink.channel}
                                </span>
                              </div>
                              {selectedInks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInkChannel(idx)}
                                  className="text-slate-400 hover:text-rose-500 text-xs"
                                >
                                  ×
                                </button>
                              )}
                            </div>

                            <select
                              value={ink.material_id || ''}
                              onChange={(e) => handleChannelInkChange(idx, e.target.value)}
                              className="w-full h-7 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 font-medium"
                            >
                              <option value="">-- Generic ৳{ink.unit_price || 2800}/L --</option>
                              {inkMaterials.map((im) => (
                                <option key={im.id} value={im.id}>
                                  {im.name} (৳{im.cost_per_unit || 2800}/L)
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5 border-t border-slate-100 dark:border-slate-800">
                              <span>Allocation: <strong>{brk ? brk.allocatedMl : autoCalculatedInkMetrics.perChannelMl} ml</strong></span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">৳{brk ? brk.channelCost.toFixed(3) : 0}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Total Ink Consumption & Per-Channel Equal Distribution Formula Banner */}
                  <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-900/50 text-[11px] text-indigo-950 dark:text-indigo-200 space-y-1">
                    <div className="flex items-center justify-between font-medium">
                      <span>💡 <strong>Ink Channel Consumption Formula:</strong> Total ml/sft divided equally across active channels (Qi = total_ml / {selectedInks.length || 4})</span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{autoCalculatedInkMetrics.perChannelMl} ml / channel / sft</span>
                    </div>
                    <div className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80 font-mono">
                      Formula: {selectedInks.map((c) => \`\${c.channel} (\${autoCalculatedInkMetrics.perChannelMl}ml)\`).join(' + ')} = {consumePerUnitMl || 1.2} ml/sft
                    </div>
                  </div>

                  {/* Consumption & Inks Cost Auto-Calculation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Total Ink Consumption (ml/sft) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={consumePerUnitMl}
                          onChange={(e) => setConsumePerUnitMl(e.target.value)}
                          className="h-9 text-xs font-mono pr-12 font-bold"
                        />
                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">ml/sft</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Calculated Inks Cost (৳/sft)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={inkCost}
                          disabled={autoCalculateInkCost}
                          onChange={(e) => setInkCost(parseFloat(e.target.value) || '')}
                          className={cn(
                            'h-9 text-xs font-mono pr-8 font-bold',
                            autoCalculateInkCost
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800'
                              : 'bg-white dark:bg-slate-900'
                          )}
                        />
                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">৳</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoCalculateInkCost}
                          onChange={(e) => setAutoCalculateInkCost(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Auto-calculate ink cost from channels</span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 2: FABRICATION & ASSEMBLY SERVICE                                    */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'production' && (
              <>
                {/* 1.2 Fabrication & Structural Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/60">
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Fabrication & Structural Configuration
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                      Signage, 3D Letters & Metal Structure
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Fabrication Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={productionCategory}
                        onChange={(e) => setProductionCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value='Signboard & Metal Frame Fabrication (এমএস ফ্রেম সাইনবোর্ড)'>Signboard & MS Metal Frame</option>
                        <option value='3D Acrylic, SS & Neon Letters (এক্রিলিক ৩ডি লেটার)'>3D Acrylic, SS & Neon Letters</option>
                        <option value='LED Backlit & Slim Lightboxes (লাইটবক্স ফ্রেম)'>LED Backlit & Slim Lightbox</option>
                        <option value='CNC Router & Laser Engraving (সিএনসি ও লেজার)'>CNC Router & Laser Cutting</option>
                        <option value='POS Displays, Kiosks & Gondolas (ডিসপ্লে কিয়স্ক)'>POS Displays, Kiosks & Racks</option>
                        <option value='Event Staging & Truss Structures (ইভেন্ট স্টেজ)'>Event Staging & Truss</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Structural Framework Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={structureFrameType}
                        onChange={(e) => setStructureFrameType(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value='1" MS Square Box Pipe (20 gauge)'>1" MS Square Box Pipe (20 gauge)</option>
                        <option value='1.5" Heavy MS Angle Steel'>1.5" Heavy MS Angle Steel Frame</option>
                        <option value='ACP Sheet Grooved Cladding'>ACP Sheet Grooved Paneling</option>
                        <option value='Aluminum Extrusion Profile Frame'>Aluminum Slim Extrusion Profile</option>
                        <option value='Wooden / Timber Stage Frame'>Wooden / Timber Frame</option>
                        <option value='Solid Acrylic 3mm-10mm Crystal'>Solid Acrylic 3mm-10mm CNC Cut</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Frame Depth / Return (ইঞ্চি) <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={frameDepth}
                        onChange={(e) => setFrameDepth(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Flat (2D)">Flat (2D Cutout)</option>
                        <option value="1 inch">1 inch (Slim Profile)</option>
                        <option value="2 inch">2 inch (Standard Letter / Box)</option>
                        <option value="3 inch">3 inch (Deep Return)</option>
                        <option value="4 inch">4 inch (Standard Lightbox)</option>
                        <option value="6 inch">6 inch (Double Sided Box)</option>
                        <option value="8 inch">8 inch (Heavy Signboard)</option>
                        <option value="12 inch">12 inch (Large Pylon / Kiosk)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Lighting & Electrical <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={lightingType}
                        onChange={(e) => setLightingType(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="none">Non-Lit (No Illumination)</option>
                        <option value="backlit_led">Backlit Samsung LED Modules (1.5W)</option>
                        <option value="frontlit_edge">Frontlit / Edge LED Strip</option>
                        <option value="neon_silicone">12V Flexible Silicone Neon</option>
                        <option value="floodlight">High-Power 50W/100W Floodlight</option>
                      </select>
                    </div>
                  </div>

                  {/* Workshop Machinery & Equipment Pre-selection */}
                  {machineries.length > 0 && (
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-lg border border-amber-200/80 dark:border-amber-900/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-amber-600" />
                          Assigned Workshop Machinery (CNC / Laser / Welding)
                        </Label>
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Auto-populates hourly rate & tool cost</span>
                      </div>
                      <select
                        value={selectedMachineId}
                        onChange={(e) => handleFleetMachineSelect(e.target.value)}
                        className="w-full h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 font-medium"
                      >
                        <option value="">-- Auto-Match Workshop Equipment --</option>
                        {machineries.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.code || 'NO-CODE'}) — {m.category} • Rate: ৳{m.hourly_rate_bdt || 0}/hr
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 1.3 Primary Structural Material (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Primary Structural Raw Material (Pipe / Sheet / Acrylic)
                      </h4>
                    </div>
                    {productionMaterialId && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Structural Material <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={productionMaterialId}
                      onChange={(e) => handleSelectProductionMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        productionMaterialId
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Structural Material (MS Pipe, SS Sheet, Acrylic, ACP) --</option>
                      {productionMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'sheet/pc'}) — ৳{getMaterialCost(mat)}/{mat.unit || 'unit'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 1.4 Structural Dimensions & Wastage Rules */}
                <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Structural Dimensions & Fabrication Rules
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Fabrication Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={fabricationMethod}
                        onChange={(e) => setFabricationMethod(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Welding & Metal Assembly">Welding & Metal Assembly</option>
                        <option value="Laser Cutting & Acrylic Bending">Laser Cutting & Acrylic Bending</option>
                        <option value="CNC Router 3D Grooving">CNC Router 3D Grooving</option>
                        <option value="Modular Profile Screwing">Modular Profile Screwing</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Cutting & Scrap Wastage (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={defaultWastagePercent}
                        onChange={(e) => setDefaultWastagePercent(parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Minimum Job Charge (BDT)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={minimumCharge}
                        onChange={(e) => setMinimumCharge(parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 3: FINISHING & LAMINATION SERVICE                                    */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'finishing' && (
              <>
                {/* 1.2 Post-Press Finishing & Surface Treatment Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60 dark:border-rose-900/60">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Post-Press Finishing & Surface Treatment Configuration
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-900/40 px-2 py-0.5 rounded">
                      Lamination, Binding & Post-Press
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Finishing Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={finishingCategory}
                        onChange={(e) => setFinishingCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Thermal Film Lamination (BOPP/PET)">Thermal Film Lamination</option>
                        <option value="Cold Pressure Sensitive Lamination">Cold Pressure Lamination</option>
                        <option value="Floor Anti-Slip & Heavy Overlaminate">Floor Anti-Slip Overlaminate</option>
                        <option value="Rigid Board Mounting & Pasting">Rigid Board Mounting / Pasting</option>
                        <option value="Eyelets & Brass Grommets">Eyelets & Brass Grommets</option>
                        <option value="Edge Hemming & Pocket Seaming">Edge Hemming & Pocket Seam</option>
                        <option value="Die-Cutting, Kiss-Cut & Creasing">Die-Cutting & Kiss-Cut</option>
                        <option value="Book Binding, Spiral & Stitching">Book Binding & Spiral</option>
                        <option value="Spot UV Varnish & Foil Stamping">Spot UV & Foil Stamping</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Application Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={finishingMethod}
                        onChange={(e) => setFinishingMethod(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Gloss Thermal Lamination">Gloss Thermal Lamination</option>
                        <option value="Matte Thermal Lamination">Matte Thermal Lamination</option>
                        <option value="Cold Film Lamination">Cold Roll Lamination</option>
                        <option value="PVC Foam Sunboard Pasting">Foam Board Flatbed Pasting</option>
                        <option value="Automatic Brass Eyeletting">Automatic Eyelet Press</option>
                        <option value="Hot Air Seaming with Rope">Hot Air Seaming with Rope</option>
                        <option value="Flatbed Plotter Kiss-Cut">Flatbed Plotter Kiss-Cut</option>
                        <option value="Wire-O Spiral Binding">Wire-O Spiral Binding</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Micron / Grade Spec <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. 32 Micron / 80 Micron / 3mm Board"
                        value={laminationMicron}
                        onChange={(e) => setLaminationMicron(e.target.value)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.3 Primary Finishing Consumable (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60 dark:border-rose-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Primary Finishing Film / Consumable (Raw Material Isolation)
                      </h4>
                    </div>
                    {finishingMaterialId && (
                      <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Finishing Consumable <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={finishingMaterialId}
                      onChange={(e) => handleSelectFinishingMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        finishingMaterialId
                          ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Finishing Raw Material (Thermal Film, Cold Lam, Eyelets, Sunboard) --</option>
                      {finishingMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'unit'}) — ৳{getMaterialCost(mat)}/{getMaterialUnitDetails(mat).consumeUnit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 4: INSTALLATION & FITTING SERVICE                                    */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'installation' && (
              <>
                {/* 1.2 Site Installation & Field Operations Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/60 dark:border-teal-900/60">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Site Installation & Field Operations Configuration
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-900/40 px-2 py-0.5 rounded">
                      Pasting, Fitting & Site Mounting
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Installation Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={installationCategory}
                        onChange={(e) => setInstallationCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Indoor Wall & Glass Sticker Pasting (গ্লাস ও ওয়াল পেস্টিং)">Wall & Glass Sticker Pasting</option>
                        <option value="Rooftop Billboard & Highway Unipole Erection">Rooftop Billboard Erection</option>
                        <option value="Shopfront Fascia & Building Sign Installation">Shopfront Sign Fitting</option>
                        <option value="Commercial Vehicle Full Body Branding & Wrap">Vehicle Branding & Wrap</option>
                        <option value="Exhibition Fair Stall & Stage Fitting">Exhibition Stall & Stage</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Height & Access Tier <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={installationHeightTier}
                        onChange={(e) => setInstallationHeightTier(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="ground">Ground Level (0-10 ft)</option>
                        <option value="mid">Mid Elevation (10-20 ft with Ladder)</option>
                        <option value="high">High Elevation (20-50 ft with Scaffolding)</option>
                        <option value="extreme">Extreme Height (50ft+ Crane / Spider Rope)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Standard Crew Size <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={installationCrewSize}
                        onChange={(e) => setInstallationCrewSize(parseInt(e.target.value) || 2)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value={1}>1 Technician (Solo Pasting)</option>
                        <option value={2}>2 Technicians (Standard Pair)</option>
                        <option value={3}>3 Technicians (Sign Fitting)</option>
                        <option value={4}>4 Technicians (Heavy Frame)</option>
                        <option value={6}>6+ Crew (Billboard / Crane Team)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.3 Fasteners, Anchors & Adhesives (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/60 dark:border-teal-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Fasteners, Anchors & Adhesives (Raw Material Isolation)
                      </h4>
                    </div>
                    {installationHardwareId && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Fastener / Mounting Material
                    </Label>
                    <select
                      value={installationHardwareId}
                      onChange={(e) => handleSelectInstallationHardware(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      <option value="">-- Select Fasteners / Silicone / Tape (Optional) --</option>
                      {installationHardwareMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'pcs'}) — ৳{getMaterialCost(mat)}/{mat.unit || 'unit'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 5: DELIVERY & LOGISTICS SERVICE                                      */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'delivery' && (
              <>
                {/* 1.2 Logistics, Packaging & Transport Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-sky-200/60 dark:border-sky-900/60">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Logistics, Packaging & Transport Configuration
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/60 dark:bg-sky-900/40 px-2 py-0.5 rounded">
                      Courier, Van & Freight Dispatch
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Logistics Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliveryCategory}
                        onChange={(e) => setDeliveryCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Local City Van / Bike Delivery (সিটি ডেলিভারি)">City Local Delivery</option>
                        <option value="Inter-District Courier & Truck Freight (আন্তঃজেলা পরিবহন)">Inter-District Freight</option>
                        <option value="Express Urgent Delivery (এক্সপ্রেস ডেলিভারি)">Express Urgent Jet</option>
                        <option value="Packaging & Crate Boxing (প্যাকেজিং ও ক্রেট)">Packaging & Crating</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Vehicle / Transport Mode <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliveryVehicleType}
                        onChange={(e) => setDeliveryVehicleType(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="motorbike">Motorbike (Small Parcels & Documents)</option>
                        <option value="cng">CNG / Easy Bike (Medium Rolls & Boards)</option>
                        <option value="pickup_van">1-Ton Pickup Van / Tata Ace (Banners & Signs)</option>
                        <option value="covered_truck">Covered Van / Truck (Nationwide Bulk)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Distance Zone <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliveryDistanceZone}
                        onChange={(e) => setDeliveryDistanceZone(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="inside_city">Inside Dhaka Metro</option>
                        <option value="suburbs">Greater Suburbs (Gazipur / Narayanganj / Savar)</option>
                        <option value="nationwide">Inter-District / Nationwide Hub</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.3 Primary Packaging Consumable (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-sky-200/60 dark:border-sky-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Packaging Consumables (Bubble Wrap / Carton / Stretch Film)
                      </h4>
                    </div>
                    {packagingMaterialId && (
                      <span className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Packaging Material
                    </Label>
                    <select
                      value={packagingMaterialId}
                      onChange={(e) => handleSelectPackagingMaterial(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      <option value="">-- Select Packaging Raw Material (Optional) --</option>
                      {packagingMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'pcs'}) — ৳{getMaterialCost(mat)}/{mat.unit || 'unit'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 6: GENERAL & CREATIVE SERVICE                                        */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'general' && (
              <>
                {/* 1.2 Creative Design & Technical Service Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-purple-200/60 dark:border-purple-900/60">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Creative Design & Technical Service Configuration
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/40 px-2 py-0.5 rounded">
                      Graphic Design, Survey & Maintenance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Service Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={generalCategory}
                        onChange={(e) => setGeneralCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Graphic Design & Pre-Press Color Separation (গ্রাফিক ডিজাইন)">Graphic Design & Pre-Press</option>
                        <option value="Site Measurement & Laser Survey (সাইট পরিমাপ)">Site Laser Survey</option>
                        <option value="Signboard Maintenance & LED Repair (রক্ষণাবেক্ষণ)">Maintenance & LED Repair</option>
                        <option value="Custom CNC / Laser Job Work (জব ওয়ার্ক)">Custom Job Work</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Deliverable Format <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliverableFormat}
                        onChange={(e) => setDeliverableFormat(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="vector_ai_pdf">Vector File (AI / EPS / PDF)</option>
                        <option value="raster_tiff_psd">High-Res Print TIFF / PSD</option>
                        <option value="site_survey_report">Physical Site Survey Report</option>
                        <option value="onsite_maintenance">On-site Maintenance Service</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Turnaround Time (Hours) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={turnaroundHours}
                        onChange={(e) => setTurnaroundHours(parseInt(e.target.value) || 24)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
`;

content = content.slice(0, step1StartIdx) + newStep1JSX + '\n\n' + content.slice(step1EndIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Step 1 technical panels upgraded successfully!');

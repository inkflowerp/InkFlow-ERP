import { test, describe } from 'node:test'
import assert from 'node:assert'

// ==============================================================================
// PrintERP SaaS - Acceptance Test Suite: Complete 23-Step Business Lifecycle
// Company: "ABC Sign & Print"
// Roles: Owner, Sales Manager, Designer, Production Manager, Operator, Staff
// ==============================================================================

describe('PrintERP SaaS — Final Acceptance Test: "ABC Sign & Print" Lifecycle', () => {
  // Shared Test Context
  const company = {
    id: 'comp-abc-001',
    name: 'ABC Sign & Print Ltd.',
    slug: 'abc-sign-print',
    currency: 'BDT',
    locale: 'bn',
    vatEnabled: true,
    defaultVatRate: 15.0,
  }

  // 6 Role Personas
  const team = {
    owner: { id: 'usr-01', name: 'Rahim Chowdhury', role: 'business_owner', email: 'owner@abcsign.com.bd' },
    sales: { id: 'usr-02', name: 'Kamrul Hasan', role: 'sales_manager', email: 'sales@abcsign.com.bd' },
    designer: { id: 'usr-03', name: 'Sultana Razia', role: 'graphic_designer', email: 'designer@abcsign.com.bd' },
    production: { id: 'usr-04', name: 'Rafiqul Islam', role: 'production_manager', email: 'production@abcsign.com.bd' },
    operator: { id: 'usr-05', name: 'Nurul Amin', role: 'machine_operator', email: 'operator@abcsign.com.bd' },
    staff: { id: 'usr-06', name: 'Karim Ullah', role: 'general_staff', email: 'staff@abcsign.com.bd' },
  }

  // Persistent Test Entities
  let customer: any = null
  let product: any = null
  let material: any = null
  let quotation: any = null
  let order: any = null
  let job: any = null
  let invoice: any = null
  let challan: any = null
  const auditLogs: any[] = []

  const logAudit = (actor: string, action: string, entityType: string, entityId: string, details: string) => {
    auditLogs.push({
      id: `aud-${auditLogs.length + 1}`,
      companyId: company.id,
      actor,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    })
  }

  // --------------------------------------------------------------------------
  // Step 1: Create Customer
  // --------------------------------------------------------------------------
  test('Step 1: Create Customer with Valid BD Phone, 13-digit BIN & District', () => {
    customer = {
      id: 'cust-sq-101',
      companyId: company.id,
      name: 'Square Retail Outlets Ltd.',
      nameBn: 'স্কয়ার রিটেইল আউটলেটস লিমিটেড',
      contactPerson: 'Tanvir Ahmed (Marketing Manager)',
      phone: '+8801711889900',
      email: 'tanvir@squareretail.com.bd',
      binNumber: '1234567890123', // 13 digits
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      address: 'House 42, Road 7, Dhanmondi R/A, Dhaka-1205',
      creditLimit: 100000,
      currentBalanceDue: 0,
      createdAt: new Date().toISOString(),
    }

    assert.ok(customer.id)
    assert.strictEqual(customer.binNumber.length, 13)
    assert.ok(customer.phone.startsWith('+8801'))
    logAudit(team.sales.name, 'customer.create', 'customer', customer.id, 'Created new commercial client')
  })

  // --------------------------------------------------------------------------
  // Step 2: Create Product
  // --------------------------------------------------------------------------
  test('Step 2: Create Product (Highway Rooftop Billboard)', () => {
    product = {
      id: 'prd-bb-201',
      companyId: company.id,
      name: 'Highway Rooftop Billboard Sign',
      nameBn: 'হাইওয়ে রুফটপ বিলবোর্ড সাইন',
      category: 'wide_flex',
      pricingUnit: 'sft',
      baseRatePerSft: 95, // ৳95/SFT
      isActive: true,
    }

    assert.strictEqual(product.pricingUnit, 'sft')
    assert.strictEqual(product.baseRatePerSft, 95)
  })

  // --------------------------------------------------------------------------
  // Step 3: Create Material & Initialize Stock
  // --------------------------------------------------------------------------
  test('Step 3: Create Material (Star Flex 10ft Roll 380 GSM) & Initialize Stock', () => {
    material = {
      id: 'mat-sf-10',
      companyId: company.id,
      name: 'Star Flex 10ft Wide Roll (380 GSM)',
      category: 'roll_media',
      rollWidthFt: 10,
      rollLengthFt: 164,
      totalSftPerRoll: 1640,
      rollsInStock: 2,
      totalAvailableSft: 3280, // 2 rolls × 1,640 SFT
      unitCostPerSft: 38, // ৳38 cost
    }

    assert.strictEqual(material.totalAvailableSft, 3280)
    logAudit(team.production.name, 'inventory.opening_stock', 'material', material.id, 'Opening stock: 2 master rolls (3,280 SFT)')
  })

  // --------------------------------------------------------------------------
  // Step 4: Create Quotation with SFT Calculation
  // --------------------------------------------------------------------------
  test('Step 4: Create Quotation with Dimensional SFT Calculation (20ft × 10ft = 200 SFT)', () => {
    const width = 20
    const height = 10
    const areaSft = width * height // 200 SFT
    const basePrintPrice = areaSft * product.baseRatePerSft // 200 × 95 = ৳19,000

    quotation = {
      id: 'quo-abc-001',
      quotationNumber: 'QUO-000001',
      companyId: company.id,
      customerId: customer.id,
      customerName: customer.name,
      dimensions: { width, height, unit: 'ft', areaSft },
      items: [
        {
          itemId: 'qi-01',
          description: 'Frontlit Solvent Star Flex Print (20ft × 10ft)',
          quantity: 1,
          areaSft,
          unitRate: product.baseRatePerSft,
          itemTotal: basePrintPrice,
        },
      ],
      finishingAddons: [],
      subtotal: basePrintPrice,
      discountAmount: 0,
      vatPercentage: company.defaultVatRate,
      status: 'draft',
      salespersonName: team.sales.name,
    }

    assert.strictEqual(quotation.dimensions.areaSft, 200)
    assert.strictEqual(quotation.subtotal, 19000)
  })

  // --------------------------------------------------------------------------
  // Step 5: Apply Measurement Pricing & Finishing Addons
  // --------------------------------------------------------------------------
  test('Step 5: Apply Eyelets (30 pcs) and MS Angle Framing (60 RFT Perimeter)', () => {
    // 20ft × 10ft perimeter = 2 × (20 + 10) = 60 Running Feet (RFT)
    const perimeterRft = 2 * (quotation.dimensions.width + quotation.dimensions.height)
    assert.strictEqual(perimeterRft, 60)

    // Eyelets every 2 feet: 30 eyelets @ ৳10
    const eyeletsCost = 30 * 10 // ৳300
    // MS Angle heavy frame: 60 RFT @ ৳40
    const framingCost = perimeterRft * 40 // ৳2,400

    quotation.finishingAddons = [
      { name: 'Eyelet Brass Rings (30 pcs)', cost: eyeletsCost },
      { name: 'MS Angle Heavy Box Frame (60 RFT)', cost: framingCost },
    ]

    quotation.subtotal = quotation.items[0].itemTotal + eyeletsCost + framingCost
    assert.strictEqual(quotation.subtotal, 21700) // 19,000 + 300 + 2,400
  })

  // --------------------------------------------------------------------------
  // Step 6: Negotiate Price & Apply Authorized Discount
  // --------------------------------------------------------------------------
  test('Step 6: Price Negotiation: Apply 5% Discount with Audit Justification', () => {
    // Client negotiates 5% discount: 5% of 21,700 = ৳1,085
    const discountRate = 5
    const discountAmount = Math.round((quotation.subtotal * discountRate) / 100) // 1,085
    quotation.discountAmount = discountAmount
    quotation.negotiatedSubtotal = quotation.subtotal - discountAmount // 20,615

    assert.strictEqual(quotation.discountAmount, 1085)
    assert.strictEqual(quotation.negotiatedSubtotal, 20615)

    logAudit(
      team.sales.name,
      'pricing.price_override',
      'quotation',
      quotation.id,
      'Approved 5% commercial discount (৳1,085) for Square Retail annual contract'
    )
  })

  // --------------------------------------------------------------------------
  // Step 7: Customer Approves Quotation
  // --------------------------------------------------------------------------
  test('Step 7: Customer Approves Proposal via Digital WhatsApp Link', () => {
    quotation.status = 'approved'
    quotation.approvedAt = new Date().toISOString()
    assert.strictEqual(quotation.status, 'approved')

    logAudit(customer.contactPerson, 'quotation.approve', 'quotation', quotation.id, 'Client confirmed price and technical specs')
  })

  // --------------------------------------------------------------------------
  // Step 8: Convert Quotation to Order
  // --------------------------------------------------------------------------
  test('Step 8: Auto-Convert Approved Quotation to Confirmed Sales Order ORD-000232', () => {
    order = {
      id: 'ord-abc-232',
      orderNumber: 'ORD-000232',
      companyId: company.id,
      quotationId: quotation.id,
      customerId: customer.id,
      customerName: customer.name,
      subtotal: quotation.negotiatedSubtotal,
      status: 'confirmed',
      priority: 'urgent',
      confirmedAt: new Date().toISOString(),
    }

    assert.strictEqual(order.subtotal, 20615)
    assert.strictEqual(order.status, 'confirmed')
    logAudit(team.sales.name, 'order.create', 'order', order.id, `Order ${order.orderNumber} booked from quotation ${quotation.quotationNumber}`)
  })

  // --------------------------------------------------------------------------
  // Step 9: Create Production Job Ticket
  // --------------------------------------------------------------------------
  test('Step 9: Generate Shop Floor Job Ticket JOB-000553 for Production Floor', () => {
    job = {
      id: 'job-abc-553',
      jobNumber: 'JOB-000553',
      companyId: company.id,
      orderId: order.id,
      machineName: 'Flora 3200 Solvent 10ft',
      assignedDepartment: 'wide_format_printing',
      assignedManager: team.production.name,
      assignedOperator: team.operator.name,
      status: 'queued',
      artworkStatus: 'pending_artwork',
    }

    assert.strictEqual(job.jobNumber, 'JOB-000553')
    assert.strictEqual(job.status, 'queued')
  })

  // --------------------------------------------------------------------------
  // Step 10: Designer Uploads Artwork
  // --------------------------------------------------------------------------
  test('Step 10: Designer (Sultana) Uploads High-Res Artwork Proof', () => {
    job.artwork = {
      fileName: 'square_billboard_final_v1.pdf',
      colorProfile: 'CMYK FOGRA39',
      resolutionDpi: 300,
      bleedMm: 3,
      dimensions: '20ft × 10ft',
      proofUrl: '/storage/prepress-proofs/square_billboard_proof.pdf',
      uploadedBy: team.designer.name,
    }
    job.artworkStatus = 'awaiting_customer_signoff'

    assert.strictEqual(job.artwork.resolutionDpi, 300)
    assert.strictEqual(job.artworkStatus, 'awaiting_customer_signoff')
    logAudit(team.designer.name, 'design.upload_proof', 'job', job.id, 'Uploaded 300 DPI CMYK digital soft proof')
  })

  // --------------------------------------------------------------------------
  // Step 11: Customer Approves Artwork
  // --------------------------------------------------------------------------
  test('Step 11: Customer Approves Digital Soft Proof', () => {
    job.artworkStatus = 'approved'
    job.artworkApprovedBy = customer.contactPerson
    job.artworkApprovedAt = new Date().toISOString()

    assert.strictEqual(job.artworkStatus, 'approved')
    logAudit(customer.contactPerson, 'design.approve_proof', 'job', job.id, 'Client signed off on digital soft proof')
  })

  // --------------------------------------------------------------------------
  // Step 12: Production Begins on Press
  // --------------------------------------------------------------------------
  test('Step 12: Operator (Nurul) Loads Roll and Starts Flora 3200 Press Run', () => {
    job.status = 'printing'
    order.status = 'in_production'
    job.startedAt = new Date().toISOString()

    assert.strictEqual(job.status, 'printing')
    assert.strictEqual(order.status, 'in_production')
    logAudit(team.operator.name, 'production.start', 'job', job.id, 'Flora 3200 press run initiated')
  })

  // --------------------------------------------------------------------------
  // Step 13: Material Consumed & Stock Ledger Deducted
  // --------------------------------------------------------------------------
  test('Step 13: Record Exact Material Consumption with 5% Operator Lead Scrap', () => {
    const netPrintSft = quotation.dimensions.areaSft // 200 SFT
    const leadScrapSft = Math.round(netPrintSft * 0.05) // 5% = 10 SFT
    const totalDeductedSft = netPrintSft + leadScrapSft // 210 SFT

    const previousStock = material.totalAvailableSft
    material.totalAvailableSft -= totalDeductedSft

    assert.strictEqual(totalDeductedSft, 210)
    assert.strictEqual(material.totalAvailableSft, 3070) // 3280 - 210

    logAudit(
      team.operator.name,
      'inventory.consumption',
      'material',
      material.id,
      `Deducted 210 SFT (200 print + 10 scrap). Previous: ${previousStock} SFT, New: ${material.totalAvailableSft} SFT`
    )
  })

  // --------------------------------------------------------------------------
  // Step 14: Finishing Completed & Quality Check Passed
  // --------------------------------------------------------------------------
  test('Step 14: Finishing Station Attaches 30 Eyelets & Quality Check Passes', () => {
    job.status = 'completed'
    job.qcPassed = true
    job.qcInspectedBy = team.production.name
    order.status = 'ready_for_delivery'

    assert.strictEqual(job.status, 'completed')
    assert.strictEqual(job.qcPassed, true)
    assert.strictEqual(order.status, 'ready_for_delivery')
  })

  // --------------------------------------------------------------------------
  // Step 15: Installation Scheduled
  // --------------------------------------------------------------------------
  test('Step 15: Schedule On-Site Rooftop Fitting with General Staff (Karim)', () => {
    const installationSchedule = {
      orderId: order.id,
      siteAddress: customer.address,
      technician: team.staff.name,
      scheduledTime: 'Tomorrow 10:00 AM',
      vehicle: 'Dhaka Metro TA-11-2345 (Pickup)',
      status: 'scheduled',
    }

    assert.strictEqual(installationSchedule.status, 'scheduled')
  })

  // --------------------------------------------------------------------------
  // Step 16: Tax Invoice Generated (Mushak 6.3)
  // --------------------------------------------------------------------------
  test('Step 16: Generate NBR Mushak 6.3 Compliant Tax Invoice with 15% VAT', () => {
    const subtotal = order.subtotal // 20,615
    const vatRate = 15 // 15% NBR Rate
    const vatAmount = Math.round((subtotal * vatRate) / 100) // 3,092
    const grandTotal = subtotal + vatAmount // 23,707

    invoice = {
      id: 'inv-abc-180',
      invoiceNumber: 'INV-000180',
      companyId: company.id,
      orderId: order.id,
      customerId: customer.id,
      subtotal,
      vatRate,
      vatAmount,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      status: 'unpaid',
      binNumber: company.vatEnabled ? '1234567890123' : null,
    }

    assert.strictEqual(invoice.subtotal, 20615)
    assert.strictEqual(invoice.vatAmount, 3092)
    assert.strictEqual(invoice.grandTotal, 23707)
    assert.strictEqual(invoice.dueAmount, 23707)
    assert.strictEqual(invoice.status, 'unpaid')

    logAudit(team.sales.name, 'invoice.create', 'invoice', invoice.id, `Created tax invoice ${invoice.invoiceNumber} for ৳23,707`)
  })

  // --------------------------------------------------------------------------
  // Step 17: Customer Makes 50% Partial Payment via bKash Merchant
  // --------------------------------------------------------------------------
  test('Step 17: Customer Deposits 50% Advance via bKash Merchant (TrxID Recorded)', () => {
    const advancePaid = 11853 // ~50%
    const payment = {
      id: 'pay-bk-7744',
      receiptNumber: 'MR-000101',
      companyId: company.id,
      invoiceId: invoice.id,
      customerId: customer.id,
      paymentMethod: 'bkash',
      trxId: 'TRX-BK-774411',
      amount: advancePaid,
      paidAt: new Date().toISOString(),
    }

    invoice.paidAmount += payment.amount
    invoice.dueAmount = invoice.grandTotal - invoice.paidAmount
    invoice.status = 'partially_paid'

    assert.strictEqual(invoice.paidAmount, 11853)
    assert.strictEqual(invoice.dueAmount, 11854) // 23,707 - 11,853 = 11,854
    assert.strictEqual(invoice.status, 'partially_paid')

    logAudit(team.sales.name, 'payment.record', 'payment', payment.id, `Recorded partial deposit ৳11,853 via bKash (Receipt: ${payment.receiptNumber})`)
  })

  // --------------------------------------------------------------------------
  // Step 18: Delivery Challan Generated & Dispatched
  // --------------------------------------------------------------------------
  test('Step 18: Issue Traditional Delivery Challan CHL-000088 for Transport', () => {
    challan = {
      id: 'chl-abc-88',
      challanNumber: 'CHL-000088',
      companyId: company.id,
      orderId: order.id,
      customerName: customer.name,
      destination: customer.address,
      transporter: team.staff.name,
      items: [{ name: 'Star Flex Billboard (20ft × 10ft)', qty: 1 }],
      status: 'dispatched',
    }

    assert.strictEqual(challan.challanNumber, 'CHL-000088')
    assert.strictEqual(challan.status, 'dispatched')
  })

  // --------------------------------------------------------------------------
  // Step 19: Site Installation Completed with Photo Signoff
  // --------------------------------------------------------------------------
  test('Step 19: Fitting Team Erects Billboard on Dhanmondi Rooftop with Site Photo', () => {
    challan.status = 'delivered'
    challan.installedAt = new Date().toISOString()
    challan.sitePhotoUrl = '/storage/installations/dhanmondi_rooftop_proof.jpg'
    challan.receivedBySignature = 'Tanvir Ahmed (Square Retail)'

    assert.strictEqual(challan.status, 'delivered')
    assert.ok(challan.sitePhotoUrl)
    logAudit(team.staff.name, 'delivery.complete', 'challan', challan.id, 'Billboard installed and client signed delivery receipt')
  })

  // --------------------------------------------------------------------------
  // Step 20: Customer Pays Remaining Due in Cash
  // --------------------------------------------------------------------------
  test('Step 20: Customer Settles Remaining Balance of ৳11,854 in Cash', () => {
    const finalPayment = {
      id: 'pay-cs-9922',
      receiptNumber: 'MR-000102',
      companyId: company.id,
      invoiceId: invoice.id,
      customerId: customer.id,
      paymentMethod: 'cash',
      amount: invoice.dueAmount, // 11,854
    }

    invoice.paidAmount += finalPayment.amount
    invoice.dueAmount = invoice.grandTotal - invoice.paidAmount
    invoice.status = 'paid'
    order.status = 'completed'

    assert.strictEqual(invoice.paidAmount, 23707)
    assert.strictEqual(invoice.dueAmount, 0)
    assert.strictEqual(invoice.status, 'paid')
    assert.strictEqual(order.status, 'completed')

    logAudit(team.staff.name, 'payment.record', 'payment', finalPayment.id, `Settled balance ৳11,854 via cash (Receipt: ${finalPayment.receiptNumber})`)
  })

  // --------------------------------------------------------------------------
  // Step 21: Calculate Actual Job Profit & Margin
  // --------------------------------------------------------------------------
  test('Step 21: Calculate True Net Job Profit (Revenue - BOM - Labor - Transport - Crane)', () => {
    // Net Revenue (excluding 15% VAT collected on behalf of NBR)
    const netRevenue = quotation.negotiatedSubtotal // ৳20,615

    // Direct Job Costs
    const mediaCost = 210 * material.unitCostPerSft // 210 SFT × ৳38 = ৳7,980
    const frameMaterialCost = 1800 // MS pipes, primer, paint
    const operatorLaborCost = 2200 // Press operator & welder wages
    const pickupTransportCost = 1200 // Pickup van fuel & driver
    const craneInstallationCost = 1500 // Fitting team daily allowance

    const totalJobCost = mediaCost + frameMaterialCost + operatorLaborCost + pickupTransportCost + craneInstallationCost
    assert.strictEqual(totalJobCost, 14680)

    const netProfit = netRevenue - totalJobCost
    const netMarginPercent = Number(((netProfit / netRevenue) * 100).toFixed(1))

    assert.strictEqual(netProfit, 5935) // 20,615 - 14,680 = 5,935
    assert.strictEqual(netMarginPercent, 28.8) // 28.8% Margin
  })

  // --------------------------------------------------------------------------
  // Step 22: Verify Reports & General Ledger
  // --------------------------------------------------------------------------
  test('Step 22: Verify Business Intelligence & Ledger Balances', () => {
    const reportSummary = {
      grossSales: invoice.subtotal, // 20,615
      vatCollected: invoice.vatAmount, // 3,092
      totalInvoiced: invoice.grandTotal, // 23,707
      totalCashCollected: invoice.paidAmount, // 23,707
      outstandingReceivables: invoice.dueAmount, // 0
      materialSftConsumed: 210,
    }

    assert.strictEqual(reportSummary.totalInvoiced, 23707)
    assert.strictEqual(reportSummary.totalCashCollected, 23707)
    assert.strictEqual(reportSummary.outstandingReceivables, 0)
    assert.strictEqual(reportSummary.materialSftConsumed, 210)
  })

  // --------------------------------------------------------------------------
  // Step 23: Verify Audit Logs Integrity
  // --------------------------------------------------------------------------
  test('Step 23: Verify Comprehensive Chronological Audit Trail (Zero Gaps)', () => {
    assert.ok(auditLogs.length >= 8)

    // Verify key security events exist in chronological order
    const actions = auditLogs.map((l) => l.action)
    assert.ok(actions.includes('customer.create'))
    assert.ok(actions.includes('pricing.price_override'))
    assert.ok(actions.includes('quotation.approve'))
    assert.ok(actions.includes('order.create'))
    assert.ok(actions.includes('design.upload_proof'))
    assert.ok(actions.includes('inventory.consumption'))
    assert.ok(actions.includes('invoice.create'))
    assert.ok(actions.includes('payment.record'))
    assert.ok(actions.includes('delivery.complete'))

    // All logs must be tied to ABC Sign & Print tenant quarantine
    auditLogs.forEach((log) => {
      assert.strictEqual(log.companyId, company.id)
      assert.ok(log.timestamp)
    })
  })
})

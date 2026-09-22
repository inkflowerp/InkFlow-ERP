import { describe, it } from 'node:test'
import assert from 'node:assert'
import { LogisticsService } from '../../services/logistics.service.ts'
import { LogisticsRepository } from '../../lib/repositories/logistics.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DeliveryChallanRecord, InstallationRecord } from '../../types/logistics.types.ts'

describe('Bangladeshi Printing Press Delivery, Logistics & On-Site Installation Upgrade Tests', () => {
  const TENANT_ID = `tenant-bd-delivery-${Date.now()}`

  it('1. Logistics KPI metrics calculation correctly aggregates daily dispatches, in-transit, partial, and COD due balances', () => {
    const todayStr = new Date().toISOString().split('T')[0]

    const mockChallans: DeliveryChallanRecord[] = [
      {
        id: 'ch-1',
        company_id: TENANT_ID,
        challan_number: 'CHL-2026-001',
        customer_id: 'cust-1',
        customer_name: 'Bashundhara Group',
        customer_phone: '01711000111',
        delivery_address: 'Bashundhara R/A, Dhaka',
        delivery_method: 'company_vehicle',
        status: 'out_for_delivery',
        scheduled_date: todayStr,
        dispatched_by_name: 'Factory Manager',
        due_amount: 15000,
        grand_total: 35000,
        paid_amount: 20000,
        items: [
          {
            id: 'item-1',
            product_description: 'PVC Banner (10x5 ft) with Eyelet Finishing',
            quantity: 5,
            unit: 'pcs',
            is_delivered: false,
          },
        ],
        created_at: new Date().toISOString(),
      },
      {
        id: 'ch-2',
        company_id: TENANT_ID,
        challan_number: 'CHL-2026-002',
        customer_id: 'cust-2',
        customer_name: 'PRAN-RFL Media',
        customer_phone: '01811000222',
        delivery_address: 'GPO, Chittagong',
        delivery_method: 'courier',
        vehicle_info: 'Sundarban Courier (Trk: CN-99482)',
        status: 'partially_delivered',
        scheduled_date: todayStr,
        dispatched_by_name: 'Factory Manager',
        due_amount: 8500,
        grand_total: 20000,
        paid_amount: 11500,
        items: [
          {
            id: 'item-2',
            product_description: 'Offset Brochure (150 GSM Art Paper, 4C)',
            quantity: 2000,
            unit: 'pcs',
            is_delivered: true,
          },
          {
            id: 'item-3',
            product_description: 'Hardboard Packaging Boxes',
            quantity: 500,
            unit: 'pcs',
            is_delivered: false,
          },
        ],
        created_at: new Date().toISOString(),
      },
      {
        id: 'ch-3',
        company_id: TENANT_ID,
        challan_number: 'CHL-2026-003',
        customer_id: 'cust-3',
        customer_name: 'Square Pharmaceuticals',
        customer_phone: '01911000333',
        delivery_address: 'Mohakhali C/A, Dhaka',
        delivery_method: 'local_transport',
        status: 'delivered',
        scheduled_date: '2026-09-10',
        dispatched_by_name: 'Factory Manager',
        due_amount: 0,
        grand_total: 50000,
        paid_amount: 50000,
        items: [
          {
            id: 'item-4',
            product_description: 'Medical Leaflets (70 GSM Offset)',
            quantity: 10000,
            unit: 'pcs',
            is_delivered: true,
          },
        ],
        created_at: new Date().toISOString(),
      },
    ]

    const mockInstallations: InstallationRecord[] = [
      {
        id: 'ins-1',
        company_id: TENANT_ID,
        customer_name: 'Aarong Flagship Outlet',
        site_location: 'Uttara Sector 3, Dhaka',
        technician_name: 'Kabir Signboard Specialist',
        technician_phone: '01700998877',
        scheduled_date: todayStr,
        status: 'on_site',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ins-2',
        company_id: TENANT_ID,
        customer_name: 'Shwapno Superstore',
        site_location: 'Dhanmondi 27, Dhaka',
        technician_name: 'Rafiq Master',
        technician_phone: '01800998877',
        scheduled_date: todayStr,
        status: 'completed',
        created_at: new Date().toISOString(),
      },
    ]

    const kpis = LogisticsService.calculateLogisticsKpis(mockChallans, mockInstallations)

    assert.strictEqual(kpis.totalChallans, 3, 'Total challans should equal 3')
    assert.strictEqual(kpis.dispatchesToday, 2, '2 challans scheduled for today')
    assert.strictEqual(kpis.outForDelivery, 1, '1 challan currently out for delivery')
    assert.strictEqual(kpis.partiallyDelivered, 1, '1 challan partially delivered')
    assert.strictEqual(kpis.fullyDelivered, 1, '1 challan fully delivered')
    assert.strictEqual(kpis.installationsActive, 1, '1 active on-site installation')
    assert.strictEqual(kpis.totalPendingDue, 23500, 'Pending Due should be 15,000 + 8,500 = 23,500 BDT')
  })

  it('2. Respectful Bengali WhatsApp notification generator produces complete slip with items and COD payment instructions', () => {
    const challan: DeliveryChallanRecord = {
      id: 'ch-wa-1',
      company_id: TENANT_ID,
      challan_number: 'CHL-2026-9901',
      invoice_number: 'INV-2026-8801',
      customer_id: 'cust-wa-1',
      customer_name: 'মেঘনা গ্রুপ অব ইন্ডাস্ট্রিজ',
      customer_phone: '01712345678',
      delivery_address: 'মতিঝিল বা/এ, ঢাকা',
      delivery_method: 'courier',
      vehicle_info: 'সুন্দরবন কুরিয়ার (ট্র্যাকিং: SB-772183)',
      delivery_person_name: 'সোহেল রানা',
      delivery_person_phone: '01899112233',
      scheduled_date: '2026-09-23',
      dispatched_by_name: 'রফিক হোসেন',
      due_amount: 12500,
      grand_total: 42500,
      paid_amount: 30000,
      items: [
        {
          id: 'item-10',
          product_description: 'এক্রিলিক ৩ডি লেটার সাইনবোর্ড (LED ব্যাকলিট)',
          quantity: 1,
          unit: 'set',
          is_delivered: false,
        },
        {
          id: 'item-11',
          product_description: 'পিভিসি ফ্রস্টেড স্টিকার পেস্টিং',
          quantity: 120,
          unit: 'sft',
          is_delivered: true,
        },
      ],
      created_at: new Date().toISOString(),
    }

    const message = LogisticsService.generateBangladeshiChallanWhatsAppMessage(challan, 'রঙধনু ডিজিটাল প্রিন্ট ও সাইনেজ')

    assert.ok(message.includes('আসসালামু আলাইকুম, *মেঘনা গ্রুপ অব ইন্ডাস্ট্রিজ*'), 'Contains customer greeting')
    assert.ok(message.includes('রঙধনু ডিজিটাল প্রিন্ট ও সাইনেজ'), 'Contains company name')
    assert.ok(message.includes('CHL-2026-9901'), 'Contains challan number')
    assert.ok(message.includes('INV-2026-8801'), 'Contains invoice number')
    assert.ok(message.includes('সুন্দরবন কুরিয়ার (ট্র্যাকিং: SB-772183)'), 'Contains vehicle tracking info')
    assert.ok(message.includes('01899112233'), 'Contains driver phone number')
    assert.ok(message.includes('এক্রিলিক ৩ডি লেটার সাইনবোর্ড'), 'Contains item 1')
    assert.ok(message.includes('পিভিসি ফ্রস্টেড স্টিকার'), 'Contains item 2')
    assert.ok(message.includes('12,500'), 'Contains BDT 12,500 due amount reminder')
    assert.ok(message.includes('বকেয়া পরিশোধের নির্দেশনা'), 'Contains COD payment instructions')
  })

  it('3. Bengali WhatsApp generator handles paid in full invoices with clean status badge', () => {
    const challan: DeliveryChallanRecord = {
      id: 'ch-wa-paid',
      company_id: TENANT_ID,
      challan_number: 'CHL-2026-9902',
      customer_id: 'cust-wa-2',
      customer_name: 'আকিজ ফুড অ্যান্ড বেভারেজ',
      customer_phone: '01912345678',
      delivery_address: 'তেজগাঁও শিল্প এলাকা, ঢাকা',
      delivery_method: 'company_vehicle',
      vehicle_info: 'ঢাকা মেট্রো-ন ১১-২২৩৩',
      delivery_person_name: 'কামাল উদ্দিন',
      scheduled_date: '2026-09-23',
      dispatched_by_name: 'রফিক হোসেন',
      due_amount: 0,
      grand_total: 75000,
      paid_amount: 75000,
      items: [
        {
          id: 'item-12',
          product_description: 'অফসেট প্রিন্ট ফুড প্যাকেজিং কার্টুন',
          quantity: 5000,
          unit: 'pcs',
          is_delivered: true,
        },
      ],
      created_at: new Date().toISOString(),
    }

    const message = LogisticsService.generateBangladeshiChallanWhatsAppMessage(challan, 'রঙধনু ডিজিটাল প্রিন্ট ও সাইনেজ')

    assert.ok(message.includes('সম্পূর্ণ বিল পরিশোধ করা আছে'), 'Message clearly states bill is paid in full')
    assert.ok(!message.includes('বকেয়া পরিশোধের নির্দেশনা'), 'Does not include due collection instructions')
  })

  it('4. Invoice creation automatically provisions Delivery Challan with 3-part copy metadata and items', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Walton Hi-Tech Industries',
      customer_phone: '+8801755667788',
      customer_address: 'Chandra, Gazipur',
      due_date: '2026-10-20',
      grand_total: 90000,
      paid_amount: 40000,
      due_amount: 50000,
      created_by_name: 'Head Cashier',
      items: [
        {
          item_name: 'Gloss Laminated Brochure',
          item_description: 'Gloss Laminated Brochure - 300 GSM Art Card (1000 Pcs)',
          quantity: 1000,
          unit: 'pcs',
          unit_price: 45,
          total_price: 45000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_ok',
          design_required: false,
        } as any,
        {
          item_name: 'Shop Signage Acrylic Board',
          item_description: 'Shop Signage Acrylic Board (8x4 ft)',
          quantity: 1,
          unit: 'pcs',
          unit_price: 45000,
          total_price: 45000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_required',
          design_required: true,
        } as any,
      ],
    })

    assert.ok(invoice.id, 'Invoice generated with ID')
    
    // Check challan in DataStore
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const challan = challans.find((c) => c.company_id === TENANT_ID && c.invoice_id === invoice.id)

    assert.ok(challan, 'Delivery Challan must be automatically provisioned')
    assert.strictEqual(challan.customer_name, 'Walton Hi-Tech Industries')
    assert.strictEqual(challan.items.length, 2, 'Contains both products')
    assert.strictEqual(challan.status, 'pending_dispatch')
  })

  it('5. Status progression to out_for_delivery and partial vs full delivery updates', async () => {
    const created = await LogisticsRepository.createChallan({
      company_id: TENANT_ID,
      customer_id: 'cust-cycle-1',
      customer_name: 'City Bank Ltd',
      customer_phone: '01711223344',
      delivery_address: 'Gulshan Avenue, Dhaka',
      dispatched_by_name: 'Dispatch Manager',
      delivery_method: 'company_vehicle',
      vehicle_info: 'Dhaka Metro-Ta 44-5566',
      items: [
        {
          id: 'it-c1',
          product_description: 'Cheque Book Jackets (1000 pcs)',
          quantity: 1000,
          unit: 'pcs',
          is_delivered: false,
        },
        {
          id: 'it-c2',
          product_description: 'Credit Card Welcome Kits (500 pcs)',
          quantity: 500,
          unit: 'pcs',
          is_delivered: false,
        },
      ],
    })

    assert.ok(created.id)
    assert.strictEqual(created.status, 'ready')

    // 1. Dispatch out for delivery
    const outForDeliveryChallan = await LogisticsService.updateChallanStatus(
      created.id,
      'out_for_delivery',
      TENANT_ID,
      { delivery_person_name: 'Shamim Mia', delivery_person_phone: '01722334455' }
    )
    assert.strictEqual(outForDeliveryChallan.status, 'out_for_delivery')
    assert.strictEqual(outForDeliveryChallan.delivery_person_name, 'Shamim Mia')

    // 2. Deliver only first item (Partial Delivery)
    const updatedItems = [
      { ...outForDeliveryChallan.items[0], is_delivered: true },
      { ...outForDeliveryChallan.items[1], is_delivered: false },
    ]
    const partialChallan = await LogisticsService.updateChallanStatus(
      created.id,
      'partially_delivered',
      TENANT_ID,
      { items: updatedItems }
    )
    assert.strictEqual(partialChallan.status, 'partially_delivered')
    assert.strictEqual(partialChallan.items[0].is_delivered, true)
    assert.strictEqual(partialChallan.items[1].is_delivered, false)

    // 3. Complete all items and record receiver acknowledgment
    const completedItems = [
      { ...outForDeliveryChallan.items[0], is_delivered: true },
      { ...outForDeliveryChallan.items[1], is_delivered: true },
    ]
    const finalDelivered = await LogisticsService.updateChallanStatus(
      created.id,
      'delivered',
      TENANT_ID,
      {
        items: completedItems,
        receiver_name: 'Kazi Moin (Branch Operations)',
        receiver_signature: 'KaziMoin-0923',
        received_at: new Date().toISOString(),
      }
    )
    assert.strictEqual(finalDelivered.status, 'delivered')
    assert.strictEqual(finalDelivered.receiver_name, 'Kazi Moin (Branch Operations)')
    assert.strictEqual(finalDelivered.receiver_signature, 'KaziMoin-0923')
  })
})

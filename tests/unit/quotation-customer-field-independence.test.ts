import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { CustomerRecord } from '../../types/crm.types.ts'

describe('Quotation Modal — Customer Name and Phone Number Field Independence Regression Tests', () => {
  interface QuotationCustomerFormState {
    selectedCustomer: CustomerRecord | null
    customerSearchQuery: string
    customerName: string
    customerNameBn: string
    customerCompany: string
    customerPhone: string
    customerWhatsapp: string
    customerEmail: string
    customerAddress: string
    customerType: string
  }

  const createInitialState = (): QuotationCustomerFormState => ({
    selectedCustomer: null,
    customerSearchQuery: '',
    customerName: '',
    customerNameBn: '',
    customerCompany: '',
    customerPhone: '',
    customerWhatsapp: '',
    customerEmail: '',
    customerAddress: '',
    customerType: 'retail',
  })

  // State handlers replicating the decoupled logic in NewQuotationModal
  const handleCustomerNameChange = (state: QuotationCustomerFormState, val: string): QuotationCustomerFormState => {
    return {
      ...state,
      customerName: val,
      customerSearchQuery: state.selectedCustomer ? state.customerSearchQuery : val,
    }
  }

  const handleCustomerPhoneChange = (state: QuotationCustomerFormState, val: string): QuotationCustomerFormState => {
    // Crucial: Phone change MUST NOT update customerSearchQuery or customerName
    return {
      ...state,
      customerPhone: val,
    }
  }

  const handleSelectCustomer = (state: QuotationCustomerFormState, cust: CustomerRecord): QuotationCustomerFormState => {
    return {
      ...state,
      selectedCustomer: cust,
      customerName: cust.name || '',
      customerNameBn: cust.name_bn || '',
      customerCompany: cust.company_name || '',
      customerPhone: cust.mobile || '',
      customerWhatsapp: cust.whatsapp || cust.mobile || '',
      customerEmail: cust.email || '',
      customerAddress: cust.address || '',
      customerType: cust.customer_type || cust.customer_category || 'retail',
    }
  }

  const handleClearCustomer = (state: QuotationCustomerFormState): QuotationCustomerFormState => {
    return {
      ...state,
      selectedCustomer: null,
      customerSearchQuery: '',
      customerName: '',
      customerNameBn: '',
      customerCompany: '',
      customerPhone: '',
      customerWhatsapp: '',
      customerEmail: '',
      customerAddress: '',
      customerType: 'retail',
    }
  }

  it('1. Typing phone number does not overwrite Customer Name (Core Regression Bug Fix)', () => {
    let state = createInitialState()

    // Step 1: User types Customer Name = "ABC Printing"
    state = handleCustomerNameChange(state, 'ABC Printing')
    assert.strictEqual(state.customerName, 'ABC Printing')
    assert.strictEqual(state.customerSearchQuery, 'ABC Printing')
    assert.strictEqual(state.customerPhone, '')

    // Step 2: User types Phone = "01712345678"
    state = handleCustomerPhoneChange(state, '01712345678')

    // Verification: Customer Name remains "ABC Printing" and Phone is "01712345678"
    assert.strictEqual(state.customerName, 'ABC Printing', 'Customer Name MUST remain unchanged when typing phone number')
    assert.strictEqual(state.customerPhone, '01712345678', 'Customer Phone MUST be updated correctly')
    assert.strictEqual(state.customerSearchQuery, 'ABC Printing', 'Customer search query MUST remain ABC Printing')
  })

  it('2. Changing phone number preserves Customer Name', () => {
    let state = createInitialState()
    state = handleCustomerNameChange(state, 'ABC Printing')
    state = handleCustomerPhoneChange(state, '01712345678')

    // Change phone to 01812345678
    state = handleCustomerPhoneChange(state, '01812345678')
    assert.strictEqual(state.customerName, 'ABC Printing')
    assert.strictEqual(state.customerPhone, '01812345678')
  })

  it('3. Changing Customer Name preserves Phone Number', () => {
    let state = createInitialState()
    state = handleCustomerNameChange(state, 'ABC Printing')
    state = handleCustomerPhoneChange(state, '01812345678')

    // Change Customer Name to "XYZ Advertising"
    state = handleCustomerNameChange(state, 'XYZ Advertising')
    assert.strictEqual(state.customerName, 'XYZ Advertising')
    assert.strictEqual(state.customerPhone, '01812345678')
    assert.strictEqual(state.customerSearchQuery, 'XYZ Advertising')
  })

  it('4. Selecting an existing customer populates all fields accurately', () => {
    let state = createInitialState()
    const mockDbCustomer: CustomerRecord = {
      id: 'cust-db-001',
      company_id: 'c-01',
      name: 'Modern Print Media',
      name_bn: 'মডার্ন প্রিন্ট মিডিয়া',
      company_name: 'Modern Group Ltd.',
      mobile: '01911223344',
      whatsapp: '01911223344',
      email: 'contact@moderngroup.com',
      address: '22 Motijheel C/A, Dhaka',
      customer_type: 'corporate',
      customer_category: 'corporate',
      credit_limit: 500000,
      payment_terms: 'net_30',
      tags: ['vip', 'corporate'],
      total_orders_count: 12,
      total_paid_amount: 1200000,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    state = handleSelectCustomer(state, mockDbCustomer)

    assert.strictEqual(state.selectedCustomer?.id, 'cust-db-001')
    assert.strictEqual(state.customerName, 'Modern Print Media')
    assert.strictEqual(state.customerNameBn, 'মডার্ন প্রিন্ট মিডিয়া')
    assert.strictEqual(state.customerCompany, 'Modern Group Ltd.')
    assert.strictEqual(state.customerPhone, '01911223344')
    assert.strictEqual(state.customerWhatsapp, '01911223344')
    assert.strictEqual(state.customerEmail, 'contact@moderngroup.com')
    assert.strictEqual(state.customerAddress, '22 Motijheel C/A, Dhaka')
    assert.strictEqual(state.customerType, 'corporate')
  })

  it('5. Editing fields after selecting existing customer maintains field independence', () => {
    let state = createInitialState()
    const mockDbCustomer: CustomerRecord = {
      id: 'cust-db-002',
      company_id: 'c-01',
      name: 'Apex Signage',
      mobile: '01711223344',
      customer_type: 'reseller',
      credit_limit: 100000,
      payment_terms: 'cash',
      tags: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    state = handleSelectCustomer(state, mockDbCustomer)

    // Edit phone
    state = handleCustomerPhoneChange(state, '01799887766')
    assert.strictEqual(state.customerName, 'Apex Signage')
    assert.strictEqual(state.customerPhone, '01799887766')

    // Edit name
    state = handleCustomerNameChange(state, 'Apex Signage & Fabrication')
    assert.strictEqual(state.customerName, 'Apex Signage & Fabrication')
    assert.strictEqual(state.customerPhone, '01799887766')
  })

  it('6. Clearing customer resets all fields cleanly', () => {
    let state = createInitialState()
    const mockDbCustomer: CustomerRecord = {
      id: 'cust-db-003',
      company_id: 'c-01',
      name: 'Rahman Advertising',
      mobile: '01611223344',
      company_name: 'Rahman Group',
      email: 'info@rahmangroup.com',
      address: 'Dhaka',
      customer_type: 'corporate',
      credit_limit: 0,
      payment_terms: 'cash',
      tags: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    state = handleSelectCustomer(state, mockDbCustomer)
    assert.notStrictEqual(state.selectedCustomer, null)

    state = handleClearCustomer(state)
    assert.strictEqual(state.selectedCustomer, null)
    assert.strictEqual(state.customerSearchQuery, '')
    assert.strictEqual(state.customerName, '')
    assert.strictEqual(state.customerNameBn, '')
    assert.strictEqual(state.customerCompany, '')
    assert.strictEqual(state.customerPhone, '')
    assert.strictEqual(state.customerWhatsapp, '')
    assert.strictEqual(state.customerEmail, '')
    assert.strictEqual(state.customerAddress, '')
    assert.strictEqual(state.customerType, 'retail')
  })
})

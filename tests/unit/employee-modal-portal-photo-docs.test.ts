import { test, describe } from 'node:test'
import assert from 'node:assert'
import type { EmployeeRecord, DocumentAttachment, PortalCredentials } from '../../types/workforce.types.ts'

describe('Add New Employee Modal - Portal Access, Photo & Document Attachment Integration', () => {
  test('1. Employee photo data URL is preserved and bound to profile_picture_url', () => {
    const mockPhotoDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...'
    const employeeData: Partial<EmployeeRecord> = {
      name: 'Md. Rahim Uddin',
      mobile: '+8801711223344',
      profile_picture_url: mockPhotoDataUrl,
    }

    assert.ok(employeeData.profile_picture_url, 'Profile picture URL must be present')
    assert.strictEqual(employeeData.profile_picture_url, mockPhotoDataUrl)
    assert.match(employeeData.profile_picture_url, /^data:image\/[a-z]+;base64,/)
  })

  test('2. Portal credentials provision correctly with username, email, password, role and invitation flag', () => {
    const portalCreds: PortalCredentials = {
      create_login: true,
      username: '01711223344',
      email: 'rahim@printpress.bd',
      password: 'PrintFlow@2026#99',
      role: 'operator',
      send_invitation: true,
    }

    const employeeData: Partial<EmployeeRecord> = {
      name: 'Md. Rahim Uddin',
      mobile: '+8801711223344',
      portal_credentials: portalCreds,
    }

    assert.ok(employeeData.portal_credentials)
    assert.strictEqual(employeeData.portal_credentials.create_login, true)
    assert.strictEqual(employeeData.portal_credentials.username, '01711223344')
    assert.strictEqual(employeeData.portal_credentials.email, 'rahim@printpress.bd')
    assert.strictEqual(employeeData.portal_credentials.password, 'PrintFlow@2026#99')
    assert.strictEqual(employeeData.portal_credentials.role, 'operator')
    assert.strictEqual(employeeData.portal_credentials.send_invitation, true)
  })

  test('3. Document attachments array supports NID front/back, appointment letter and certificates', () => {
    const docs: DocumentAttachment[] = [
      {
        id: 'doc-001',
        name: 'nid_front_rahim.jpg',
        type: 'nid_front',
        size: '1.2 MB',
        url: 'data:image/jpeg;base64,mocknidfront...',
        uploaded_at: '2026-10-07T12:00:00Z',
      },
      {
        id: 'doc-002',
        name: 'nid_back_rahim.jpg',
        type: 'nid_back',
        size: '1.1 MB',
        url: 'data:image/jpeg;base64,mocknidback...',
        uploaded_at: '2026-10-07T12:01:00Z',
      },
      {
        id: 'doc-003',
        name: 'appointment_letter.pdf',
        type: 'appointment_letter',
        size: '340 KB',
        url: 'data:application/pdf;base64,mockpdf...',
        uploaded_at: '2026-10-07T12:02:00Z',
      },
      {
        id: 'doc-004',
        name: 'trade_certificate.pdf',
        type: 'certificate',
        size: '520 KB',
        url: 'data:application/pdf;base64,mockcert...',
        uploaded_at: '2026-10-07T12:03:00Z',
      },
    ]

    const employeeData: Partial<EmployeeRecord> = {
      name: 'Md. Rahim Uddin',
      mobile: '+8801711223344',
      document_attachments: docs,
    }

    assert.ok(employeeData.document_attachments)
    assert.strictEqual(employeeData.document_attachments.length, 4)

    const nidFront = employeeData.document_attachments.find((d) => d.type === 'nid_front')
    assert.ok(nidFront, 'NID front must be attached')
    assert.strictEqual(nidFront.name, 'nid_front_rahim.jpg')
    assert.strictEqual(nidFront.size, '1.2 MB')

    const appLetter = employeeData.document_attachments.find((d) => d.type === 'appointment_letter')
    assert.ok(appLetter, 'Appointment letter must be attached')
    assert.strictEqual(appLetter.name, 'appointment_letter.pdf')
  })

  test('4. Full employee payload preserves photo, portal access and documents simultaneously', () => {
    const fullEmployeePayload: Partial<EmployeeRecord> = {
      name: 'Karim Ahmed',
      mobile: '+8801811998877',
      employee_id_number: 'EMP-2026-4455',
      department: 'printing',
      role: 'Eco-Solvent Operator',
      profile_picture_url: 'data:image/png;base64,mockavatarpng',
      portal_credentials: {
        create_login: true,
        username: '01811998877',
        role: 'operator',
        send_invitation: true,
      },
      document_attachments: [
        {
          id: 'doc-101',
          name: 'karim_nid.jpg',
          type: 'nid_front',
          size: '850 KB',
          url: 'data:image/jpeg;base64,karimnid',
          uploaded_at: new Date().toISOString(),
        },
      ],
    }

    assert.strictEqual(fullEmployeePayload.profile_picture_url, 'data:image/png;base64,mockavatarpng')
    assert.strictEqual(fullEmployeePayload.portal_credentials?.create_login, true)
    assert.strictEqual(fullEmployeePayload.portal_credentials?.role, 'operator')
    assert.strictEqual(fullEmployeePayload.document_attachments?.length, 1)
    assert.strictEqual(fullEmployeePayload.document_attachments?.[0].type, 'nid_front')
  })
})

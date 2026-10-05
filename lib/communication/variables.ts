export interface TemplateVariableDefinition {
  tag: string
  name: string
  description: string
  category: 'company' | 'customer' | 'quotation' | 'invoice' | 'user'
  example: string
}

export const SUPPORTED_TEMPLATE_VARIABLES: {
  company: TemplateVariableDefinition[]
  customer: TemplateVariableDefinition[]
  quotation: TemplateVariableDefinition[]
  invoice: TemplateVariableDefinition[]
  user: TemplateVariableDefinition[]
} = {
  company: [
    { tag: '{{company_name}}', name: 'Company Name', description: 'Your business / tenant trade name', category: 'company', example: 'Print & Signage Enterprise' },
    { tag: '{{company_phone}}', name: 'Company Phone', description: 'Official company phone / hotline', category: 'company', example: '+880 1711-000000' },
    { tag: '{{company_email}}', name: 'Company Email', description: 'Official business email', category: 'company', example: 'billing@example.com' },
    { tag: '{{company_address}}', name: 'Company Address', description: 'Registered business address', category: 'company', example: '12/A Motijheel C/A, Dhaka' },
    { tag: '{{company_website}}', name: 'Company Website', description: 'Public website or portal URL', category: 'company', example: 'https://demo.printflow.bd' },
  ],
  customer: [
    { tag: '{{customer_name}}', name: 'Customer Name', description: 'Client contact person or name', category: 'customer', example: 'Ashiqur Rahman' },
    { tag: '{{customer_company}}', name: 'Customer Company', description: 'Client organization / company name', category: 'customer', example: 'Metro Advertising Ltd.' },
    { tag: '{{customer_phone}}', name: 'Customer Phone', description: 'Customer mobile / phone number', category: 'customer', example: '+880 1711-223344' },
    { tag: '{{customer_whatsapp}}', name: 'Customer WhatsApp', description: 'WhatsApp number for chat messaging', category: 'customer', example: '+880 1711-223344' },
    { tag: '{{customer_email}}', name: 'Customer Email', description: 'Customer email address', category: 'customer', example: 'ashiq@metromedia.com' },
    { tag: '{{customer_address}}', name: 'Customer Address', description: 'Delivery / billing street address', category: 'customer', example: 'Gulshan-2, Dhaka' },
  ],
  quotation: [
    { tag: '{{quotation_number}}', name: 'Quotation Number', description: 'Unique quotation identifier', category: 'quotation', example: 'Q-2026-0842' },
    { tag: '{{quotation_date}}', name: 'Quotation Date', description: 'Date the quotation was generated', category: 'quotation', example: '2026-09-14' },
    { tag: '{{valid_until}}', name: 'Valid Until', description: 'Quotation validity expiry date', category: 'quotation', example: '2026-09-29' },
    { tag: '{{quotation_total}}', name: 'Quotation Grand Total', description: 'Total quotation value in BDT', category: 'quotation', example: '45,200.00' },
    { tag: '{{items_summary}}', name: 'Items Summary', description: 'Brief list of quoted products and quantities', category: 'quotation', example: '10x Outdoor Billboards (20x10ft)' },
  ],
  invoice: [
    { tag: '{{invoice_number}}', name: 'Invoice Number', description: 'Official tax invoice identifier', category: 'invoice', example: 'INV-2026-1049' },
    { tag: '{{invoice_date}}', name: 'Invoice Date', description: 'Date invoice was issued', category: 'invoice', example: '2026-09-14' },
    { tag: '{{due_date}}', name: 'Payment Due Date', description: 'Date by which invoice should be settled', category: 'invoice', example: '2026-09-28' },
    { tag: '{{grand_total}}', name: 'Grand Total', description: 'Final invoice amount after tax and discount', category: 'invoice', example: '58,450.00' },
    { tag: '{{paid_amount}}', name: 'Paid Amount', description: 'Total payments received against invoice', category: 'invoice', example: '30,000.00' },
    { tag: '{{due_amount}}', name: 'Outstanding Due', description: 'Remaining balance left to be paid', category: 'invoice', example: '28,450.00' },
    { tag: '{{payment_status}}', name: 'Payment Status', description: 'Current payment state (paid/partial/unpaid)', category: 'invoice', example: 'Partially Paid' },
  ],
  user: [
    { tag: '{{sender_name}}', name: 'Sender Name', description: 'Name of the current employee / sender', category: 'user', example: 'Tanvir Hossain' },
    { tag: '{{sender_email}}', name: 'Sender Email', description: 'Email address of logged in staff', category: 'user', example: 'tanvir@printflow.bd' },
    { tag: '{{sender_phone}}', name: 'Sender Phone', description: 'Phone number of creator', category: 'user', example: '+880 1812-345678' },
  ],
}

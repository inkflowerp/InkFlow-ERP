import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@formepdf/react';
import { generatePdfBytes } from '../../lib/pdf/pdf-generator.ts';
import { formatLakhCrore, numberToWordsBDT } from '../../lib/formatters.ts';

describe('pdfcn Vector PDF Generation Engine Suite', () => {
  test('1. generatePdfBytes renders valid vector PDF bytes with %PDF header', async () => {
    const InvoiceDoc = () =>
      React.createElement(
        Document,
        { title: 'Commercial Invoice' },
        React.createElement(
          Page,
          { size: 'A4' },
          React.createElement(
            View,
            { style: { padding: 36 } },
            React.createElement(
              Text,
              { style: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' } },
              'PrintCraft Visuals Ltd. - Commercial Invoice'
            ),
            React.createElement(
              Text,
              { style: { fontSize: 11, color: '#475569', marginTop: 8 } },
              `Invoice Total: BDT ${formatLakhCrore(50025)}`
            ),
            React.createElement(
              Text,
              { style: { fontSize: 10, color: '#16a34a', marginTop: 4 } },
              `In Words: ${numberToWordsBDT(50025)}`
            )
          )
        )
      );

    const bytes = await generatePdfBytes(React.createElement(InvoiceDoc));
    assert.ok(bytes instanceof Uint8Array, 'Result must be a Uint8Array');
    assert.ok(bytes.length > 500, `PDF size should be substantial (got ${bytes.length} bytes)`);

    // First 4 bytes must be "%PDF"
    const header = Buffer.from(bytes.slice(0, 4)).toString('ascii');
    assert.strictEqual(header, '%PDF', 'Must start with %PDF magic bytes');
  });

  test('2. Quotation format calculations and BDT words integration', async () => {
    const grandTotal = 123625;
    const inWords = numberToWordsBDT(grandTotal);
    assert.ok(inWords.includes('Taka'), 'Must produce Bangladeshi Taka wording');
    assert.ok(inWords.includes('One Lakh Twenty Three Thousand Six Hundred Twenty Five'), 'Must match BDT lakh-crore representation');

    const formattedLakh = formatLakhCrore(grandTotal);
    assert.strictEqual(formattedLakh, '1,23,625', 'Must follow South Asian digit grouping');

    const QuotationDoc = () =>
      React.createElement(
        Document,
        { title: 'Price Quotation' },
        React.createElement(
          Page,
          { size: 'A4' },
          React.createElement(
            View,
            { style: { padding: 36 } },
            React.createElement(
              Text,
              { style: { fontSize: 18, fontWeight: 'bold' } },
              'Quotation #QUO-2026-0042'
            ),
            React.createElement(
              Text,
              { style: { fontSize: 12, marginTop: 6 } },
              `Estimated Grand Total: BDT ${formattedLakh}`
            )
          )
        )
      );

    const bytes = await generatePdfBytes(React.createElement(QuotationDoc));
    assert.ok(bytes.length > 500, 'Must generate valid PDF bytes');
    const header = Buffer.from(bytes.slice(0, 4)).toString('ascii');
    assert.strictEqual(header, '%PDF');
  });

  test('3. Delivery Challan gate pass layout compiles to PDF vector bytes', async () => {
    const ChallanDoc = () =>
      React.createElement(
        Document,
        { title: 'Delivery Challan' },
        React.createElement(
          Page,
          { size: 'A4' },
          React.createElement(
            View,
            { style: { padding: 36 } },
            React.createElement(
              Text,
              { style: { fontSize: 18, fontWeight: 'bold' } },
              'Delivery Challan #CHL-2026-0158'
            ),
            React.createElement(
              Text,
              { style: { fontSize: 10, color: '#64748b', marginTop: 4 } },
              'Destination: Motijheel Branch, Dhaka | Vehicle: Dhaka Metro-Cha-11-2345'
            )
          )
        )
      );

    const bytes = await generatePdfBytes(React.createElement(ChallanDoc));
    assert.ok(bytes.length > 500, 'Challan PDF must generate bytes');
    const header = Buffer.from(bytes.slice(0, 4)).toString('ascii');
    assert.strictEqual(header, '%PDF');
  });

  test('4. Money Receipt voucher PDF compiles with allocation records', async () => {
    const ReceiptDoc = () =>
      React.createElement(
        Document,
        { title: 'Money Receipt' },
        React.createElement(
          Page,
          { size: 'A4' },
          React.createElement(
            View,
            { style: { padding: 36 } },
            React.createElement(
              Text,
              { style: { fontSize: 18, fontWeight: 'bold', color: '#065f46' } },
              'Official Money Receipt #RCP-2026-0412'
            ),
            React.createElement(
              Text,
              { style: { fontSize: 12, marginTop: 4 } },
              `Amount Received: BDT ${formatLakhCrore(75000)}`
            ),
            React.createElement(
              Text,
              { style: { fontSize: 10, color: '#047857', marginTop: 2 } },
              numberToWordsBDT(75000)
            )
          )
        )
      );

    const bytes = await generatePdfBytes(React.createElement(ReceiptDoc));
    assert.ok(bytes.length > 500, 'Money receipt PDF must generate bytes');
    const header = Buffer.from(bytes.slice(0, 4)).toString('ascii');
    assert.strictEqual(header, '%PDF');
  });
});

import React from "react";
import { Document, Page, StyleSheet, View } from "@formepdf/react";
import { BRAND } from "@/config/brand";
import {
  PdfcnThemeProvider,
  usePdfcnTheme,
} from "../primitives/theme-provider";
import { Text } from "../primitives/text";
import { Badge } from "../primitives/badge";
import { KeyValue } from "../primitives/key-value";
import { PageHeader } from "../primitives/page-header";
import { PageFooter } from "../primitives/page-footer";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../primitives/table";
import { PdfSignatureBlock } from "../primitives/signature";
import { PdfQRCode } from "../primitives/qrcode";
import type { PdfcnTheme } from "../themes/types";
import type { QuotationRecord, QuotationItemRecord } from "@/types/quotation.types";
import type { DocumentTemplateConfigRecord } from "@/types/tax-and-docs.types";
import { formatLakhCrore, numberToWordsBDT } from "@/lib/formatters";

export interface QuotationPdfProps {
  theme?: PdfcnTheme;
  quotation: QuotationRecord;
  company?: {
    name?: string | null;
    tagline?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    binNumber?: string | null;
  };
  languageMode?: 'en' | 'bn';
  template?: DocumentTemplateConfigRecord | null;
}

const QuotationPdfContent = ({
  quotation,
  company,
  languageMode,
  template,
}: {
  quotation: QuotationRecord;
  company?: QuotationPdfProps["company"];
  languageMode?: 'en' | 'bn';
  template?: DocumentTemplateConfigRecord | null;
}) => {
  const isBn = (languageMode || quotation.language_mode) === 'bn' || (!languageMode && template?.default_language === 'bengali');
  const theme = usePdfcnTheme();

  const companyName = (isBn && template?.company_name_bn) ? template.company_name_bn : (company?.name || BRAND.name);
  const companySubtitle = company?.tagline || "Printing & Signage Manufacturing";
  const companyAddress = company?.address || "";
  const companyContact = `${company?.phone || "+880 1700-000000"} · ${company?.email || "sales@printflow.bd"}`;
  const headerRightText = template?.header_disclaimer && !/[^\u0000-\u007F]/.test(template.header_disclaimer) ? template.header_disclaimer : "COMMERCIAL PRICE ESTIMATE / QUOTATION";

  const appOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || `https://${BRAND.rootDomain}`;
  const qrPayload = `${appOrigin}/api/pdf/quotation?id=${encodeURIComponent(quotation.quotation_number || quotation.id)}`;

  // Resilient item fallback ensuring PDF never displays an empty item table when totals exist
  const rawItems = quotation.items || [];
  const items: QuotationItemRecord[] = rawItems.length > 0
    ? rawItems
    : (quotation.subtotal > 0 || quotation.grand_total > 0)
    ? [
        {
          id: `fallback-${quotation.id}`,
          quotation_id: quotation.id,
          product_id: null,
          item_kind: 'service',
          product_type: null,
          category_preset: null,
          description: String(quotation.customer_company ? `Custom Printing & Production for ${quotation.customer_company}` : "Custom Printing & Production Scope"),
          description_bn: null,
          material_spec: null,
          dimensions_spec: null,
          width: 0,
          height: 0,
          dimension_unit: "ft" as const,
          area_sft: 0,
          quantity: 1,
          unit: "lot",
          unit_rate: quotation.subtotal || quotation.grand_total || 0,
          unit_price: quotation.subtotal || quotation.grand_total || 0,
          rate_source: "default",
          item_total: quotation.subtotal || quotation.grand_total || 0,
        }
      ]
    : [];

  const styles = StyleSheet.create({
    page: {
      backgroundColor: theme.colors.background,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    metaCol: {
      width: "48.5%",
      flexShrink: 0,
    },
    clientCard: {
      backgroundColor: theme.colors.muted,
      borderRadius: theme.primitives.borderRadius.sm,
      padding: 12,
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 16,
    },
    notesCol: {
      width: "53%",
      flexShrink: 0,
    },
    summaryCard: {
      width: 245,
      backgroundColor: theme.colors.muted,
      borderRadius: theme.primitives.borderRadius.sm,
      padding: 12,
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inWordsBox: {
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.muted,
      borderRadius: theme.primitives.borderRadius.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      borderLeftStyle: "solid",
    },
    termsBox: {
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.muted,
      borderRadius: theme.primitives.borderRadius.sm,
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });

  const formattedInWords = numberToWordsBDT(quotation.grand_total || 0);

  // Split multi-line terms for crisp layout (synchronizing with configured template from settings -> Print formats)
  const defaultTerms = template?.footer_terms_en || "1. 50% advance along with work order confirmation, balance on delivery.\n2. Proof approval required before mass production.\n3. Quotation valid for 15 days from issuance.\n4. Delivery timeline starts after artwork confirmation.";
  const rawTerms = (quotation.terms_and_conditions && !/[^\u0000-\u007F]/.test(quotation.terms_and_conditions))
    ? quotation.terms_and_conditions
    : defaultTerms;
  const termsList = rawTerms.split("\n").map(t => t.trim()).filter(Boolean);

const advancePct = quotation.advance_percentage !== undefined && quotation.advance_percentage !== null ? quotation.advance_percentage : 50;
  const advanceAmt = quotation.advance_amount !== undefined && quotation.advance_amount !== null ? quotation.advance_amount : Math.round(((quotation.grand_total || 0) * advancePct) / 100);
  const dueAmt = quotation.due_on_delivery !== undefined && quotation.due_on_delivery !== null ? quotation.due_on_delivery : Math.max(0, (quotation.grand_total || 0) - advanceAmt);

  return (
    <Document title={`Quotation ${quotation.quotation_number}`}>
      <Page size="A4" margin={{ bottom: 36, left: 36, right: 36, top: 36 }}>
        <PageFooter
          leftText={`Quotation valid until: ${quotation.valid_until || "15 days from issuance"} · Subject to terms`}
          rightText={`Quotation ${quotation.quotation_number || ""}`}
          sticky
        />

        <View style={styles.page as never}>
          {/* Header */}
          <PageHeader
            variant="simple"
            title={companyName}
            subtitle={companyAddress ? `${companySubtitle} | ${companyAddress}` : companySubtitle}
            rightText={headerRightText}
            rightSubText={companyContact}
            marginBottom={14}
          />

          {/* Metadata & Client Grid */}
          <View style={styles.metaRow}>
            {/* Customer Details */}
            <View style={[styles.metaCol, styles.clientCard] as never}>
              <Text variant="xs" weight="bold" color="mutedForeground" uppercase noMargin>
                QUOTATION PREPARED FOR
              </Text>
              <Text variant="sm" weight="bold" noMargin style={{ marginTop: 4 }}>
                {quotation.customer_name}
              </Text>
              {quotation.customer_company && (
                <Text variant="xs" weight="medium" noMargin color="mutedForeground">
                  {quotation.customer_company}
                </Text>
              )}
              {quotation.customer_address && (
                <Text variant="xs" noMargin color="mutedForeground">
                  {quotation.customer_address}
                </Text>
              )}
              <Text variant="xs" noMargin color="mutedForeground">
                Phone: {quotation.customer_phone || "N/A"}
              </Text>
              {quotation.customer_email && (
                <Text variant="xs" noMargin color="mutedForeground">
                  Email: {quotation.customer_email}
                </Text>
              )}
              {quotation.customer_bin && (
                <Text variant="xs" noMargin color="mutedForeground">
                  BIN: {quotation.customer_bin}
                </Text>
              )}
            </View>

            {/* Quotation Meta */}
            <View style={[styles.metaCol, styles.clientCard] as never}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text variant="xs" weight="bold" color="mutedForeground" uppercase noMargin>
                  ESTIMATE DETAILS
                </Text>
                <Badge label={quotation.status.toUpperCase()} variant="primary" size="sm" />
              </View>

              <KeyValue
                size="sm"
                labelFlex={0.75}
                items={[
                  { key: "Quote No:", value: String(quotation.quotation_number || "N/A") },
                  { key: "Quote Date:", value: String(quotation.quotation_date || new Date().toISOString().split("T")[0]) },
                  { key: "Valid Until:", value: String(quotation.valid_until || "15 days from issuance") },
                  { key: "Sales Executive:", value: String(quotation.salesperson_name || "Sales Team") },
                  ...(quotation.reference_no ? [{ key: "Customer Ref:", value: String(quotation.reference_no) }] : []),
                ]}
              />
            </View>
          </View>

          {/* Line Items Table: Matching Preview & Print */}
          <Table variant="bordered" zebraStripe>
            <TableHeader>
              <TableRow header>
                <TableCell width="5%" align="center">#</TableCell>
                <TableCell width="39%">Item Description & Specifications</TableCell>
                <TableCell width="14%" align="center">Dimensions</TableCell>
                <TableCell width="14%" align="center">Area / Qty</TableCell>
                <TableCell width="13%" align="right">Unit Rate (BDT)</TableCell>
                <TableCell width="15%" align="right">Total (BDT)</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const dimText = item.width && item.height
                  ? `${item.width} × ${item.height} ${item.dimension_unit || 'ft'}`
                  : '—';

                const areaOrQty = item.area_sft && item.area_sft > 0
                  ? `${item.area_sft} sqft`
                  : `${item.quantity || 1} ${item.unit || 'pcs'}`;

                const specBadges = [
                  item.material_spec ? `Material: ${item.material_spec}` : null,
                  item.finishing && item.finishing !== 'None' ? `Finishing: ${item.finishing}` : null,
                ].filter(Boolean);

                return (
                  <TableRow key={item.id || idx}>
                    <TableCell width="5%" align="center">
                      <Text variant="xs" weight="medium" noMargin>
                        {`${idx + 1}`}
                      </Text>
                    </TableCell>
                    <TableCell width="39%">
                      <Text variant="xs" weight="bold" noMargin>
                        {item.description || (item.description_bn && !/[^\u0000-\u007F]/.test(item.description_bn) ? item.description_bn : "Printing Item")}
                      </Text>
                      {specBadges.length > 0 && (
                        <View style={{ marginTop: 2 }}>
                          {specBadges.map((spec, sIdx) => (
                            <Text key={sIdx} variant="xs" color="mutedForeground" noMargin style={{ fontSize: 7.5, marginTop: 1 }}>
                              {spec}
                            </Text>
                          ))}
                        </View>
                      )}
                    </TableCell>
                    <TableCell width="14%" align="center">
                      <Text variant="xs" weight="medium" noMargin>
                        {dimText}
                      </Text>
                    </TableCell>
                    <TableCell width="14%" align="center">
                      <Text variant="xs" weight="bold" noMargin>
                        {areaOrQty}
                      </Text>
                    </TableCell>
                    <TableCell width="13%" align="right">
                      <Text variant="xs" noMargin>
                        {formatLakhCrore(item.unit_rate || item.unit_price || 0)}
                      </Text>
                    </TableCell>
                    <TableCell width="15%" align="right">
                      <Text variant="xs" weight="bold" noMargin>
                        {formatLakhCrore(item.item_total || ((item.quantity || 1) * (item.unit_rate || 0)))}
                      </Text>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Summary & Terms Section */}
          <View style={styles.summaryContainer}>
            <View style={styles.notesCol}>
              <View style={styles.inWordsBox}>
                <Text variant="xs" weight="bold" noMargin color="mutedForeground" uppercase style={{ fontSize: 7 }}>
                  In Words:
                </Text>
                <Text variant="xs" weight="semibold" noMargin style={{ marginTop: 2 }}>
                  {formattedInWords}
                </Text>
              </View>

              {/* Terms and Conditions */}
              <View style={styles.termsBox}>
                <Text variant="xs" weight="bold" noMargin color="mutedForeground" uppercase style={{ fontSize: 7 }}>
                  Terms & Delivery Conditions:
                </Text>
                <View style={{ marginTop: 3 }}>
                  {termsList.map((term, tIdx) => (
                    <Text key={tIdx} variant="xs" noMargin color="foreground" style={{ marginTop: 2, fontSize: 8, lineHeight: 1.3 }}>
                      {term}
                    </Text>
                  ))}
                </View>
              </View>

              {quotation.notes && (
                <View style={[styles.termsBox, { marginTop: 6 }] as never}>
                  <Text variant="xs" weight="bold" noMargin color="mutedForeground" uppercase style={{ fontSize: 7 }}>
                    Notes / Instructions:
                  </Text>
                  <Text variant="xs" color="foreground" noMargin style={{ marginTop: 2, fontSize: 8, lineHeight: 1.3 }}>
                    {quotation.notes}
                  </Text>
                </View>
              )}

              {/* Official Payment Accounts (Matching Preview) */}
              <View style={[styles.termsBox, { marginTop: 6 }] as never}>
                <Text variant="xs" weight="bold" noMargin color="mutedForeground" uppercase style={{ fontSize: 7 }}>
                  Official Payment Accounts:
                </Text>
                <View style={{ marginTop: 2 }}>
                  <Text variant="xs" noMargin color="foreground" style={{ fontSize: 7.5, lineHeight: 1.3 }}>
                    • bKash / Nagad (Merchant): 01711-000000 (Counter 1)
                  </Text>
                  <Text variant="xs" noMargin color="foreground" style={{ fontSize: 7.5, lineHeight: 1.3 }}>
                    • Bank: City Bank Ltd, Motijheel Branch, A/C: 1102938471001
                  </Text>
                  <Text variant="xs" noMargin color="foreground" style={{ fontSize: 7.5, lineHeight: 1.3 }}>
                    • Account Name: {companyName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Financial Box */}
            <View style={styles.summaryCard}>
              <KeyValue
                size="sm"
                divided
                labelFlex={1.1}
                items={[
                  { key: "Subtotal:", value: `BDT ${formatLakhCrore(quotation.subtotal || 0)}` },
                  ...(quotation.discount_amount > 0 ? [{ key: "Discount:", value: `- BDT ${formatLakhCrore(quotation.discount_amount)}` }] : []),
                  ...(quotation.vat_amount > 0 ? [{ key: `VAT (${quotation.vat_rate || 0}%):`, value: `BDT ${formatLakhCrore(quotation.vat_amount)}` }] : []),
                  {
                    key: "Estimated Total:",
                    keyStyle: { fontSize: 10.5, fontWeight: "bold" as const },
                    value: `BDT ${formatLakhCrore(quotation.grand_total || 0)}`,
                    valueStyle: { fontSize: 10.5, fontWeight: "bold" as const, color: theme.colors.primary },
                  },
                  {
                    key: `Advance Required (${advancePct}%):`,
                    value: `BDT ${formatLakhCrore(advanceAmt)}`,
                    keyStyle: { fontWeight: "bold" as const },
                    valueStyle: { fontWeight: "bold" as const, color: theme.colors.primary },
                  },
                  {
                    key: "Due on Delivery:",
                    value: `BDT ${formatLakhCrore(dueAmt)}`,
                    keyStyle: { fontWeight: "bold" as const },
                    valueStyle: { fontWeight: "bold" as const },
                  },
                ]}
              />
            </View>
          </View>

          {/* Signatures & QR Code */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20 }}>
            <View>
              <PdfQRCode value={qrPayload} size={58} margin={2} />
              <Text variant="xs" color="mutedForeground" noMargin style={{ fontSize: 7, marginTop: 3, textAlign: "center" }}>
                Scan to Verify
              </Text>
            </View>

            <View style={{ width: 350 }}>
              <PdfSignatureBlock
                variant="double"
                signers={[
                  { label: "Prepared By", name: quotation.salesperson_name || "Sales Executive", date: quotation.quotation_date },
                  { label: template?.authorized_signatory_title && !/[^\u0000-\u007F]/.test(template.authorized_signatory_title) ? template.authorized_signatory_title : "Authorized Signatory", name: "Authorized Signatory", date: "" },
                ]}
              />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export const QuotationPdfDocument = ({
  theme,
  quotation,
  company,
  languageMode,
  template,
}: QuotationPdfProps) => (
  <PdfcnThemeProvider theme={theme}>
    <QuotationPdfContent
      quotation={quotation}
      company={company}
      languageMode={languageMode}
      template={template}
    />
  </PdfcnThemeProvider>
);

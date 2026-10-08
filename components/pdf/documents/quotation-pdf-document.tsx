import React from"react";
import { Document, Page, StyleSheet, View } from"@formepdf/react";
import { BRAND } from "@/config/brand";
import {
 PdfcnThemeProvider,
 usePdfcnTheme,
} from"../primitives/theme-provider";
import { Text } from"../primitives/text";
import { Badge } from"../primitives/badge";
import { KeyValue } from"../primitives/key-value";
import { PageHeader } from"../primitives/page-header";
import { PageFooter } from"../primitives/page-footer";
import { Table, TableBody, TableCell, TableHeader, TableRow } from"../primitives/table";
import { PdfSignatureBlock } from"../primitives/signature";
import { PdfQRCode } from"../primitives/qrcode";
import type { PdfcnTheme } from"../themes/types";
import type { QuotationRecord } from"@/types/quotation.types";
import { formatLakhCrore, numberToWordsBDT } from"@/lib/formatters";

import type { DocumentTemplateSettings } from '@/types/document-template.types';

export interface QuotationPdfProps {
 theme?: PdfcnTheme;
 quotation: QuotationRecord;
 template?: DocumentTemplateSettings;
 company?: {
 name?: string | null;
 tagline?: string | null;
 address?: string | null;
 phone?: string | null;
 email?: string | null;
 website?: string | null;
 binNumber?: string | null;
  };
}

const QuotationPdfContent = ({ quotation, company, template }: { quotation: QuotationRecord; company?: QuotationPdfProps["company"]; template?: DocumentTemplateSettings }) => {
 const theme = usePdfcnTheme();

 const companyName = company?.name || BRAND.name;
 const companySubtitle = company?.tagline ||"Printing & Signage Manufacturing";
 const companyAddress = company?.address ||"";
 const companyContact = `${company?.phone ||"+880 1700-000000"} · ${company?.email ||"sales@printflow.bd"}`;

 const appOrigin =
   typeof window !== 'undefined' && window.location?.origin
     ? window.location.origin
     : process.env.NEXT_PUBLIC_APP_URL || `https://${BRAND.rootDomain}`
 const qrPayload = `${appOrigin}/api/pdf/quotation?id=${encodeURIComponent(quotation.quotation_number || quotation.id)}`;

 const styles = StyleSheet.create({
 page: {
 backgroundColor: theme.colors.background,
    },
 metaRow: {
 flexDirection:"row",
 justifyContent:"space-between",
 marginBottom: 16,
    },
 metaCol: {
 width:"48.5%",
 flexShrink: 0,
    },
 clientCard: {
 backgroundColor: theme.colors.muted,
 borderRadius: theme.primitives.borderRadius.sm,
 padding: 12,
 borderStyle:"solid",
 borderWidth: 1,
 borderColor: theme.colors.border,
    },
 summaryContainer: {
 flexDirection:"row",
 justifyContent:"space-between",
 marginTop: 16,
    },
 notesCol: {
 width:"54%",
 flexShrink: 0,
    },
 summaryCard: {
 width: 240,
 backgroundColor: theme.colors.muted,
 borderRadius: theme.primitives.borderRadius.sm,
 padding: 12,
 borderStyle:"solid",
 borderWidth: 1,
 borderColor: theme.colors.border,
    },
 inWordsBox: {
 marginTop: 10,
 padding: 8,
 backgroundColor:"#f8fafc",
 borderRadius: theme.primitives.borderRadius.sm,
 borderLeftWidth: 3,
 borderLeftColor: theme.colors.primary,
 borderLeftStyle:"solid",
    },
 termsBox: {
 marginTop: 10,
 padding: 8,
 backgroundColor:"#f8fafc",
 borderRadius: theme.primitives.borderRadius.sm,
    },
  });

 const formattedInWords = numberToWordsBDT(quotation.grand_total || 0);

 const topMargin = template?.padding_top ? Math.round(template.padding_top * 2.83) : 36;
 const bottomMargin = template?.padding_bottom ? Math.round(template.padding_bottom * 2.83) : 36;
 const leftMargin = template?.padding_left ? Math.round(template.padding_left * 2.83) : 36;
 const rightMargin = template?.padding_right ? Math.round(template.padding_right * 2.83) : 36;

 return (
    <Document title={`Quotation ${quotation.quotation_number}`}>
      <Page size="A4"margin={{ bottom: bottomMargin, left: leftMargin, right: rightMargin, top: topMargin }}>
        <PageFooter
 leftText={`Quotation valid until: ${quotation.valid_until} · Subject to terms`}
 rightText={`Quotation ${quotation.quotation_number}`}
 sticky
        />

        <View style={styles.page as never}>
          {/* Header */}
          <PageHeader
 variant="simple"title={companyName}
 subtitle={companyAddress ? `${companySubtitle} | ${companyAddress}` : companySubtitle}
 rightText="PRICE ESTIMATE / QUOTATION"rightSubText={companyContact}
 marginBottom={14}
          />

          {/* Metadata & Client Grid */}
          <View style={styles.metaRow}>
            {/* Customer Details */}
            <View style={[styles.metaCol, styles.clientCard] as never}>
              <Text variant="xs"weight="bold"color="mutedForeground"uppercase noMargin>
 QUOTATION PREPARED FOR
              </Text>
              <Text variant="sm"weight="bold"noMargin style={{ marginTop: 4 }}>
                {quotation.customer_name}
              </Text>
              {quotation.customer_company && (
                <Text variant="xs"weight="medium"noMargin color="mutedForeground">
                  {quotation.customer_company}
                </Text>
              )}
              {quotation.customer_address && (
                <Text variant="xs"noMargin color="mutedForeground">
                  {quotation.customer_address}
                </Text>
              )}
              <Text variant="xs"noMargin color="mutedForeground">
 Phone: {quotation.customer_phone ||"N/A"}
              </Text>
              {quotation.customer_bin && (
                <Text variant="xs"noMargin color="mutedForeground">
 BIN: {quotation.customer_bin}
                </Text>
              )}
            </View>

            {/* Quotation Meta */}
            <View style={[styles.metaCol, styles.clientCard] as never}>
              <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}>
                <Text variant="xs"weight="bold"color="mutedForeground"uppercase noMargin>
 ESTIMATE DETAILS
                </Text>
                <Badge label={quotation.status.toUpperCase()} variant="primary"size="sm"/>
              </View>

              <KeyValue
 size="sm"items={[
                  { key:"Quote No:", value: quotation.quotation_number },
                  { key:"Quote Date:", value: quotation.quotation_date },
                  { key:"Valid Until:", value: quotation.valid_until },
                  { key:"Sales Executive:", value: quotation.salesperson_name ||"Sales Team"},
                  ...(quotation.reference_no ? [{ key:"Customer Ref:", value: quotation.reference_no }] : []),
                ]}
              />
            </View>
          </View>

          {/* Line Items Table */}
          <Table variant="bordered"zebraStripe>
            <TableHeader>
              <TableRow header>
                <TableCell width="6%"align="center">Sl</TableCell>
                <TableCell width="48%">Job Description & Specifications</TableCell>
                <TableCell width="12%"align="center">Qty</TableCell>
                <TableCell width="16%"align="right">Rate (BDT)</TableCell>
                <TableCell width="18%"align="right">Total (BDT)</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(quotation.items || []).map((item, idx) => {
 const specs = [
 item.material_spec,
 item.dimensions_spec || (item.width && item.height ? `${item.width} x ${item.height} ${item.dimension_unit}` : null),
 item.area_sft ? `${item.area_sft} sqft` : null,
 item.finishing,
                ].filter(Boolean).join("|");

 return (
                  <TableRow key={item.id || idx}>
                    <TableCell width="6%"align="center">{`${idx + 1}`}</TableCell>
                    <TableCell width="48%">
                      <Text variant="xs"weight="bold"noMargin>
                        {item.description ||"Printing Item"}
                      </Text>
                      {specs ? (
                        <Text variant="xs"color="mutedForeground"noMargin style={{ marginTop: 2, fontSize: 8 }}>
                          {specs}
                        </Text>
                      ) : null}
                    </TableCell>
                    <TableCell width="12%"align="center">
                      {`${item.quantity} ${item.unit ||"pcs"}`}
                    </TableCell>
                    <TableCell width="16%"align="right">
                      {formatLakhCrore(item.unit_rate || item.unit_price || 0)}
                    </TableCell>
                    <TableCell width="18%"align="right">
                      {formatLakhCrore(item.item_total || (item.quantity * (item.unit_rate || 0)))}
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
                <Text variant="xs"weight="bold"noMargin color="mutedForeground"uppercase>
 In Words:
                </Text>
                <Text variant="xs"weight="semibold"noMargin style={{ marginTop: 2 }}>
                  {formattedInWords}
                </Text>
              </View>

              {/* Terms and Conditions */}
              <View style={styles.termsBox}>
                <Text variant="xs"weight="bold"noMargin color="mutedForeground"uppercase>
 Terms & Delivery Conditions:
                </Text>
                <Text variant="xs"noMargin color="foreground"style={{ marginTop: 2 }}>
                  {quotation.terms_and_conditions ||"1. 50% advance along with work order confirmation, balance on delivery.\n2. Proof approval required before mass production.\n3. Quotation valid for 15 days from issuance."}
                </Text>
              </View>

              {quotation.notes && (
                <View style={{ marginTop: 6 }}>
                  <Text variant="xs"color="mutedForeground"noMargin>
 Notes: {quotation.notes}
                  </Text>
                </View>
              )}
            </View>

            {/* Right Financial Box */}
            <View style={styles.summaryCard}>
              <KeyValue
 size="sm"divided
 items={[
                  { key:"Subtotal:", value: `BDT ${formatLakhCrore(quotation.subtotal || 0)}` },
                  ...(quotation.discount_amount > 0 ? [{ key:"Discount:", value: `- BDT ${formatLakhCrore(quotation.discount_amount)}` }] : []),
                  ...(quotation.vat_amount > 0 ? [{ key: `VAT (${quotation.vat_rate || 0}%):`, value: `BDT ${formatLakhCrore(quotation.vat_amount)}` }] : []),
                  {
 key:"Estimated Total:",
 keyStyle: { fontSize: 11, fontWeight:"bold"},
 value: `BDT ${formatLakhCrore(quotation.grand_total || 0)}`,
 valueStyle: { fontSize: 11, fontWeight:"bold", color: theme.colors.primary },
                  },
                  ...(quotation.advance_amount ? [{ key:"Advance Required:", value: `BDT ${formatLakhCrore(quotation.advance_amount)}` }] : []),
                  ...(quotation.due_on_delivery ? [{ key:"Due on Delivery:", value: `BDT ${formatLakhCrore(quotation.due_on_delivery)}` }] : []),
                ]}
              />
            </View>
          </View>

          {/* Signatures & QR Code */}
          <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"flex-end", marginTop: 24 }}>
            <View>
              <PdfQRCode value={qrPayload} size={64} margin={2} />
              <Text variant="xs"color="mutedForeground"noMargin style={{ fontSize: 7, marginTop: 4, textAlign:"center"}}>
 Scan to Verify
              </Text>
            </View>

            <View style={{ width: 360 }}>
              <PdfSignatureBlock
 variant="double"signers={[
                  { label:"Prepared By", name: quotation.salesperson_name ||"Sales Executive", date: quotation.quotation_date },
                  { label:"Client Acceptance", name:"Authorized Signatory", date:""},
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
 template,
}: QuotationPdfProps) => (
  <PdfcnThemeProvider theme={theme}>
    <QuotationPdfContent quotation={quotation} company={company} template={template} />
  </PdfcnThemeProvider>
);

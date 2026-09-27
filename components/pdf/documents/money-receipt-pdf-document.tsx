import React from "react";
import { Document, Page, StyleSheet, View } from "@formepdf/react";
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
import type { PaymentRecord } from "@/types/billing.types";
import { formatLakhCrore, numberToWordsBDT } from "@/lib/formatters";

export interface MoneyReceiptPdfProps {
  theme?: PdfcnTheme;
  payment: PaymentRecord;
  company?: {
    name?: string | null;
    tagline?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}

const MoneyReceiptPdfContent = ({ payment, company }: { payment: PaymentRecord; company?: MoneyReceiptPdfProps["company"] }) => {
  const theme = usePdfcnTheme();

  const companyName = company?.name || "InkFlow PrintERP";
  const companySubtitle = company?.tagline || "Printing & Signage Manufacturing";
  const companyAddress = company?.address || "Dhaka, Bangladesh";
  const companyContact = `${company?.phone || "+880 1700-000000"}  ·  ${company?.email || "accounts@inkflow-erp.com"}`;

  const qrPayload = `https://rangao.inkflow-erp.vercel.app/api/pdf/receipt?id=${encodeURIComponent(payment.receipt_number || payment.id)}`;

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
    card: {
      backgroundColor: theme.colors.muted,
      borderRadius: theme.primitives.borderRadius.sm,
      padding: 12,
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    amountHighlight: {
      marginTop: 12,
      padding: 14,
      backgroundColor: "#ecfdf5",
      borderRadius: theme.primitives.borderRadius.sm,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#6ee7b7",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    inWordsBox: {
      marginTop: 12,
      padding: 10,
      backgroundColor: "#f8fafc",
      borderRadius: theme.primitives.borderRadius.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      borderLeftStyle: "solid",
    },
  });

  const formattedInWords = numberToWordsBDT(payment.amount || 0);

  return (
    <Document title={`Money Receipt ${payment.receipt_number}`}>
      <Page size="A4" margin={{ bottom: 36, left: 36, right: 36, top: 36 }}>
        <PageFooter
          leftText={`Official Payment Voucher  ·  ${companyName}`}
          rightText={`Receipt ${payment.receipt_number}`}
          sticky
        />

        <View style={styles.page as never}>
          <PageHeader
            variant="simple"
            title={companyName}
            subtitle={`${companySubtitle}  |  ${companyAddress}`}
            rightText="OFFICIAL MONEY RECEIPT"
            rightSubText={companyContact}
            marginBottom={14}
          />

          <View style={styles.metaRow}>
            {/* Received From */}
            <View style={[styles.metaCol, styles.card] as never}>
              <Text variant="xs" weight="bold" color="mutedForeground" uppercase noMargin>
                RECEIVED WITH THANKS FROM
              </Text>
              <Text variant="sm" weight="bold" noMargin style={{ marginTop: 4 }}>
                {payment.customer_name}
              </Text>
              <Text variant="xs" noMargin color="mutedForeground" style={{ marginTop: 2 }}>
                Payment Purpose: {payment.payment_type?.replace(/_/g, " ").toUpperCase() || "PAYMENT"}
              </Text>
            </View>

            {/* Receipt Meta */}
            <View style={[styles.metaCol, styles.card] as never}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text variant="xs" weight="bold" color="mutedForeground" uppercase noMargin>
                  PAYMENT SPECIFICATIONS
                </Text>
                <Badge label={payment.payment_method?.toUpperCase()} variant="success" size="sm" />
              </View>

              <KeyValue
                size="sm"
                labelFlex={1.3}
                items={[
                  { key: "Receipt No:", value: payment.receipt_number },
                  { key: "Payment Date:", value: payment.payment_date },
                  { key: "Method:", value: payment.payment_method?.toUpperCase() },
                  ...(payment.bank_name ? [{ key: "Bank / Branch:", value: payment.bank_name }] : []),
                  ...(payment.cheque_number ? [{ key: "Cheque No / Date:", value: `${payment.cheque_number} (${payment.cheque_date || ''})` }] : []),
                  ...(payment.mfs_transaction_id ? [{ key: "MFS Trx ID:", value: payment.mfs_transaction_id }] : []),
                ]}
              />
            </View>
          </View>

          {/* Amount Box */}
          <View style={styles.amountHighlight}>
            <View>
              <Text variant="xs" weight="bold" color="mutedForeground" uppercase noMargin>
                AMOUNT RECEIVED
              </Text>
              <Text variant="xl" weight="bold" noMargin style={{ color: "#065f46", marginTop: 2 }}>
                BDT {formatLakhCrore(payment.amount || 0)}
              </Text>
            </View>
            <Badge label="PAYMENT CONFIRMED" variant="success" size="md" />
          </View>

          {/* In Words */}
          <View style={styles.inWordsBox}>
            <Text variant="xs" weight="bold" noMargin color="mutedForeground" uppercase>
              Amount in Words:
            </Text>
            <Text variant="sm" weight="semibold" noMargin style={{ marginTop: 3 }}>
              {formattedInWords}
            </Text>
          </View>

          {/* Invoice Allocations if available */}
          {payment.allocations && payment.allocations.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text variant="xs" weight="bold" color="mutedForeground" uppercase noMargin style={{ marginBottom: 6 }}>
                INVOICE SETTLEMENT BREAKDOWN
              </Text>
              <Table variant="bordered">
                <TableHeader>
                  <TableRow header>
                    <TableCell width="10%" align="center">Sl</TableCell>
                    <TableCell width="60%">Settled Invoice</TableCell>
                    <TableCell width="30%" align="right">Allocated Amount (BDT)</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payment.allocations.map((alloc, idx) => (
                    <TableRow key={alloc.id || idx}>
                      <TableCell width="10%" align="center">{`${idx + 1}`}</TableCell>
                      <TableCell width="60%">{alloc.invoice_number || alloc.invoice_id}</TableCell>
                      <TableCell width="30%" align="right">{formatLakhCrore(alloc.allocated_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </View>
          )}

          {/* Cheque realization clause */}
          {payment.payment_method === "cheque" && (
            <View style={{ marginTop: 10, padding: 6, backgroundColor: "#fef3c7", borderRadius: 4 }}>
              <Text variant="xs" noMargin style={{ color: "#92400e" }}>
                * Note: Cheque payments are accepted subject to realization in bank account.
              </Text>
            </View>
          )}

          {/* Signatures & Security */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 36 }}>
            <View>
              <PdfQRCode value={qrPayload} size={64} margin={2} />
              <Text variant="xs" color="mutedForeground" noMargin style={{ fontSize: 7, marginTop: 4, textAlign: "center" }}>
                Scan to Verify Voucher
              </Text>
            </View>

            <View style={{ width: 360 }}>
              <PdfSignatureBlock
                variant="double"
                signers={[
                  { label: "Received By", name: payment.received_by_name || "Cashier / Accounts", date: payment.payment_date },
                  { label: "Authorized Signatory", name: companyName, date: payment.payment_date },
                ]}
              />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export const MoneyReceiptPdfDocument = ({
  theme,
  payment,
  company,
}: MoneyReceiptPdfProps) => (
  <PdfcnThemeProvider theme={theme}>
    <MoneyReceiptPdfContent payment={payment} company={company} />
  </PdfcnThemeProvider>
);

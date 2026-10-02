import React from"react";
import { Document, Page, StyleSheet, View } from"@formepdf/react";
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
import type { DeliveryChallanRecord } from"@/types/logistics.types";

export interface ChallanPdfProps {
 theme?: PdfcnTheme;
 challan: DeliveryChallanRecord;
 company?: {
 name?: string | null;
 tagline?: string | null;
 address?: string | null;
 phone?: string | null;
 email?: string | null;
  };
}

const ChallanPdfContent = ({ challan, company }: { challan: DeliveryChallanRecord; company?: ChallanPdfProps["company"] }) => {
 const theme = usePdfcnTheme();

 const companyName = company?.name ||"InkFlow PrintERP";
 const companySubtitle = company?.tagline ||"Printing & Signage Manufacturing";
 const companyAddress = company?.address ||"";
 const companyContact = `${company?.phone ||"+880 1700-000000"} · ${company?.email ||"dispatch@inkflow-erp.com"}`;

 const qrPayload = `https://rangao.inkflow-erp.vercel.app/api/pdf/challan?id=${encodeURIComponent(challan.challan_number || challan.id)}`;

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
 card: {
 backgroundColor: theme.colors.muted,
 borderRadius: theme.primitives.borderRadius.sm,
 padding: 12,
 borderStyle:"solid",
 borderWidth: 1,
 borderColor: theme.colors.border,
    },
 securityNotice: {
 marginTop: 12,
 padding: 8,
 backgroundColor:"#f8fafc",
 borderRadius: theme.primitives.borderRadius.sm,
 borderLeftWidth: 3,
 borderLeftColor: theme.colors.primary,
 borderLeftStyle:"solid",
    },
  });

 return (
    <Document title={`Delivery Challan ${challan.challan_number}`}>
      <Page size="A4"margin={{ bottom: 36, left: 36, right: 36, top: 36 }}>
        <PageFooter
 leftText={`Delivery Challan & Gate Pass · ${companyName}`}
 rightText={`Challan ${challan.challan_number}`}
 sticky
        />

        <View style={styles.page as never}>
          <PageHeader
 variant="simple"title={companyName}
 subtitle={companyAddress ? `${companySubtitle} | ${companyAddress}` : companySubtitle}
 rightText="DELIVERY CHALLAN / GATE PASS"rightSubText={companyContact}
 marginBottom={14}
          />

          <View style={styles.metaRow}>
            {/* Delivery Destination */}
            <View style={[styles.metaCol, styles.card] as never}>
              <Text variant="xs"weight="bold"color="mutedForeground"uppercase noMargin>
 SHIP TO / DELIVERY DESTINATION
              </Text>
              <Text variant="sm"weight="bold"noMargin style={{ marginTop: 4 }}>
                {challan.customer_name}
              </Text>
              <Text variant="xs"noMargin color="mutedForeground">
 Delivery Address: {challan.delivery_address ||"Factory Pickup"}
              </Text>
              <Text variant="xs"noMargin color="mutedForeground">
 Phone: {challan.customer_phone ||"N/A"}
              </Text>
            </View>

            {/* Challan Meta */}
            <View style={[styles.metaCol, styles.card] as never}>
              <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}>
                <Text variant="xs"weight="bold"color="mutedForeground"uppercase noMargin>
 DISPATCH INFORMATION
                </Text>
                <Badge label={challan.status.toUpperCase()} variant="info"size="sm"/>
              </View>

              <KeyValue
 size="sm"items={[
                  { key:"Challan No:", value: challan.challan_number },
                  { key:"Date:", value: challan.scheduled_date ||"Today"},
                  { key:"Method:", value: challan.delivery_method?.replace(/_/g,"").toUpperCase() ||"DIRECT"},
                  ...(challan.invoice_number ? [{ key:"Invoice Ref:", value: challan.invoice_number }] : []),
                  ...(challan.vehicle_info ? [{ key:"Vehicle / Driver:", value: `${challan.vehicle_info} (${challan.delivery_person_name || ''})` }] : []),
                ]}
              />
            </View>
          </View>

          {/* Items Table */}
          <Table variant="bordered"zebraStripe>
            <TableHeader>
              <TableRow header>
                <TableCell width="6%"align="center">Sl</TableCell>
                <TableCell width="54%">Dispatched Item Description</TableCell>
                <TableCell width="15%"align="center">Specs / Size</TableCell>
                <TableCell width="12%"align="center">Dispatched Qty</TableCell>
                <TableCell width="13%"align="center">Received Qty</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(challan.items || []).map((item, idx) => (
                <TableRow key={item.id || idx}>
                  <TableCell width="6%"align="center">{`${idx + 1}`}</TableCell>
                  <TableCell width="54%">
                    <Text variant="xs"weight="bold"noMargin>
                      {item.product_description}
                    </Text>
                    {item.remarks && (
                      <Text variant="xs"color="mutedForeground"noMargin style={{ fontSize: 8 }}>
                        {item.remarks}
                      </Text>
                    )}
                  </TableCell>
                  <TableCell width="15%"align="center">
                    <Text variant="xs"noMargin>
                      {item.dimensions_spec ||"Standard"}
                    </Text>
                  </TableCell>
                  <TableCell width="12%"align="center">
                    <Text variant="xs"weight="bold"noMargin>
                      {`${item.quantity} ${item.unit ||"pcs"}`}
                    </Text>
                  </TableCell>
                  <TableCell width="13%"align="center">
                    <Text variant="xs"color="mutedForeground"noMargin>
                      [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                    </Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Text variant="xs"weight="semibold"noMargin>
 Acknowledgement & Goods Receipt Condition:
            </Text>
            <Text variant="xs"color="mutedForeground"noMargin style={{ marginTop: 2 }}>
 Received the above goods in good order and satisfactory condition. Any claims for damage or discrepancy must be reported within 24 hours of delivery.
            </Text>
          </View>

          {/* Signatures & Security Pass */}
          <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"flex-end", marginTop: 28 }}>
            <View>
              <PdfQRCode value={qrPayload} size={64} margin={2} />
              <Text variant="xs"color="mutedForeground"noMargin style={{ fontSize: 7, marginTop: 4, textAlign:"center"}}>
 Gate Pass Verification
              </Text>
            </View>

            <View style={{ width: 400 }}>
              <PdfSignatureBlock
 variant="double"signers={[
                  { label:"Dispatched By (Store In-charge)", name: challan.delivery_person_name ||"Factory Store", date: challan.scheduled_date },
                  { label:"Received in Good Order (Customer Seal & Sign)", name:"", date:""},
                ]}
              />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export const ChallanPdfDocument = ({
 theme,
 challan,
 company,
}: ChallanPdfProps) => (
  <PdfcnThemeProvider theme={theme}>
    <ChallanPdfContent challan={challan} company={company} />
  </PdfcnThemeProvider>
);

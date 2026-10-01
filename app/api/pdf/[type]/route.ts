import { NextRequest, NextResponse } from "next/server.js";
import React from "react";
import { generatePdfBytes } from "@/lib/pdf/pdf-generator";
import { InvoicePdfDocument } from "@/components/pdf/documents/invoice-pdf-document";
import { QuotationPdfDocument } from "@/components/pdf/documents/quotation-pdf-document";
import { ChallanPdfDocument } from "@/components/pdf/documents/challan-pdf-document";
import { MoneyReceiptPdfDocument } from "@/components/pdf/documents/money-receipt-pdf-document";
import { BillingService } from "@/services/billing.service";
import { QuotationService } from "@/services/quotation.service";
import { LogisticsService } from "@/services/logistics.service";
import { TenantRepository } from "@/lib/repositories/tenant.repository";
import { getCurrentTenant } from "@/lib/auth/tenant-auth";
import { getCurrentPlatformUser } from "@/lib/auth/platform-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await context.params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const companyId = searchParams.get("companyId");

    if (!id) {
      return new NextResponse("Document ID parameter is required", { status: 400 });
    }

    if (!companyId) {
      return new NextResponse("Company ID parameter is required", { status: 400 });
    }

    // Fail-Closed Authentication & Tenant Authorization Guard
    const [tenant, platformUser] = await Promise.all([
      getCurrentTenant(companyId),
      getCurrentPlatformUser(),
    ]);

    const isAuthorizedTenant =
      tenant &&
      (tenant.companyId === companyId ||
        tenant.companySlug === companyId.toLowerCase().trim());
    const isAuthorizedPlatform = Boolean(platformUser && platformUser.is_active);

    if (!isAuthorizedTenant && !isAuthorizedPlatform) {
      return new NextResponse("Unauthorized: Valid authenticated session required to access documents", {
        status: 401,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    }

    let tenantCompany = null;
    try {
      tenantCompany = await TenantRepository.getCompanyById(companyId);
    } catch {
      // fallback
    }

    const companyMeta = {
      name: tenantCompany?.name || "InkFlow PrintERP",
      tagline: tenantCompany?.legal_name || "Printing & Signage Solutions",
      address: tenantCompany?.address || "Dhaka, Bangladesh",
      phone: tenantCompany?.phone || "+880 1700-000000",
      email: tenantCompany?.email || "billing@inkflow-erp.com",
      website: tenantCompany?.website || "www.inkflow-erp.com",
      binNumber: tenantCompany?.bin_no || undefined,
    };

    let documentElement: React.ReactElement | null = null;
    let filename = `${type}-${id}.pdf`;

    if (type === "invoice" || type === "billing") {
      const invoice = await BillingService.getInvoiceById(id, companyId);
      if (!invoice) {
        return new NextResponse("Invoice record not found", { status: 404 });
      }
      documentElement = React.createElement(InvoicePdfDocument, {
        invoice,
        company: companyMeta,
      });
      filename = `INV-${invoice.invoice_number}.pdf`;
    } else if (type === "quotation" || type === "estimate") {
      const quotation = await QuotationService.getQuotationById(id, companyId);
      if (!quotation) {
        return new NextResponse("Quotation record not found", { status: 404 });
      }
      documentElement = React.createElement(QuotationPdfDocument, {
        quotation,
        company: companyMeta,
      });
      filename = `QUO-${quotation.quotation_number}.pdf`;
    } else if (type === "challan" || type === "delivery") {
      const challan = await LogisticsService.getChallanById(id, companyId);
      if (!challan) {
        return new NextResponse("Challan record not found", { status: 404 });
      }
      documentElement = React.createElement(ChallanPdfDocument, {
        challan,
        company: companyMeta,
      });
      filename = `CHL-${challan.challan_number}.pdf`;
    } else if (type === "receipt" || type === "payment") {
      const payments = await BillingService.getPayments(companyId);
      const payment = payments.find((p) => p.id === id || p.receipt_number === id);
      if (!payment) {
        return new NextResponse("Payment receipt not found", { status: 404 });
      }
      documentElement = React.createElement(MoneyReceiptPdfDocument, {
        payment,
        company: companyMeta,
      });
      filename = `RCP-${payment.receipt_number}.pdf`;
    } else {
      return new NextResponse(`Unsupported document type: ${type}`, { status: 400 });
    }

    const pdfBytes = await generatePdfBytes(documentElement);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("[API/PDF] Error generating PDF:", error);
    return new NextResponse(`PDF Generation Failed: ${error?.message || "Unknown error"}`, { status: 500 });
  }
}

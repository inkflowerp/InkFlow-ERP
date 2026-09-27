import React from "react";

/**
 * Universal PDF Generator using Forme PDF & pdfcn architecture.
 * Supports vector rendering in both client browser (WASM) and Node server.
 */

export async function generatePdfBytes(
  element: React.ReactElement
): Promise<Uint8Array> {
  const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined";

  if (isBrowser) {
    // Client-side browser WASM rendering
    const [{ serialize }, { renderSerializedDoc }] = await Promise.all([
      import("@formepdf/react"),
      import("@formepdf/core/browser"),
    ]);

    const serialized = serialize(element);
    const buffer = await renderSerializedDoc(
      serialized as unknown as Record<string, unknown>
    );
    return new Uint8Array(buffer);
  } else {
    // Server-side Node.js rendering
    const [{ serialize }, { renderPdf }] = await Promise.all([
      import("@formepdf/react"),
      import("@formepdf/core"),
    ]);

    const serialized = serialize(element);
    const pdfBytes = await renderPdf(JSON.stringify(serialized));
    return new Uint8Array(pdfBytes);
  }
}

export async function generatePdfBlob(
  element: React.ReactElement
): Promise<Blob> {
  const bytes = await generatePdfBytes(element);
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export async function downloadPdf(
  element: React.ReactElement,
  filename: string
): Promise<void> {
  const blob = await generatePdfBlob(element);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getPdfBlobUrl(
  element: React.ReactElement
): Promise<{ url: string; revoke: () => void }> {
  const blob = await generatePdfBlob(element);
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}

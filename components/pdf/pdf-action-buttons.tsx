"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2 } from "lucide-react";
import { downloadPdf } from "@/lib/pdf/pdf-generator";
import { PdfViewerModal } from "./pdf-viewer-modal";

interface PdfActionButtonsProps {
  document: React.ReactElement;
  filename: string;
  title: string;
  className?: string;
}

export function PdfActionButtons({
  document,
  filename,
  title,
  className = "",
}: PdfActionButtonsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadPdf(document, filename);
    } catch (err) {
      console.error("Download PDF error:", err);
      // Fallback: open print dialog if client wasm fails
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsPreviewOpen(true)}
          className="h-9 text-xs font-semibold border-input hover:bg-muted text-foreground dark:text-foreground"
          title="Preview Vector PDF before printing or downloading"
        >
          <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
          Print / Preview
        </Button>

        <Button
          size="sm"
          disabled={isDownloading}
          onClick={handleDownload}
          className="bg-slate-900 hover:bg-slate-800 text-xs text-white h-9 font-bold shadow-sm"
          title="Directly download high-resolution vector PDF"
        >
          {isDownloading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Download PDF
        </Button>
      </div>

      <PdfViewerModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={title}
        document={document}
        filename={filename}
      />
    </>
  );
}

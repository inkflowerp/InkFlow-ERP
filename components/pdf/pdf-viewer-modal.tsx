"use client";

import React, { useEffect, useState } from"react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from"@/components/ui/dialog";
import { Button } from"@/components/ui/button";
import { Download, Printer, Loader2, FileText, ExternalLink } from"lucide-react";
import { generatePdfBlob } from"@/lib/pdf/pdf-generator";

interface PdfViewerModalProps {
 isOpen: boolean;
 onClose: () => void;
 title: string;
 document: React.ReactElement;
 filename: string;
}

export function PdfViewerModal({
 isOpen,
 onClose,
 title,
 document,
 filename,
}: PdfViewerModalProps) {
 const [blobUrl, setBlobUrl] = useState<string | null>(null);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 let url: string | null = null;
 let cancelled = false;

 if (isOpen && document) {
 setIsLoading(true);
 setError(null);

 generatePdfBlob(document)
        .then((blob) => {
 if (cancelled) return;
 url = URL.createObjectURL(blob);
 setBlobUrl(url);
 setIsLoading(false);
        })
        .catch((err) => {
 if (cancelled) return;
 console.error("PDF generation failed:", err);
 setError(err?.message ||"Failed to generate vector PDF.");
 setIsLoading(false);
        });
    } else {
 setBlobUrl(null);
    }

 return () => {
 cancelled = true;
 if (url) {
 URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, document]);

 const handleDownload = () => {
 if (!blobUrl) return;
 const a = window.document.createElement("a");
 a.href = blobUrl;
 a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
 window.document.body.appendChild(a);
 a.click();
 window.document.body.removeChild(a);
  };

 const handlePrint = () => {
 if (!blobUrl) return;
 const iframe = window.document.getElementById("pdf-preview-iframe") as HTMLIFrameElement;
 if (iframe && iframe.contentWindow) {
 iframe.contentWindow.print();
    } else {
 window.open(blobUrl,"_blank");
    }
  };

 return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} maxWidth="max-w-5xl">
      <DialogContent onClose={onClose} className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface-inset text-foreground border-border">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0 bg-surface-inset text-foreground pr-14">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="h-4 w-4"/>
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
 Vector PDF Rendering Engine (pdfcn + Forme WASM)
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <Button
 size="sm"variant="outline"disabled={!blobUrl || isLoading}
 onClick={handlePrint}
 className="h-8 text-xs font-semibold bg-surface-inset border-border hover:bg-card-elevated text-foreground">
              <Printer className="mr-1.5 h-3.5 w-3.5"/>
 Print
            </Button>

            <Button
 size="sm"disabled={!blobUrl || isLoading}
 onClick={handleDownload}
 className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="mr-1.5 h-3.5 w-3.5"/>
 Download .pdf
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-surface-inset relative overflow-hidden flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              <p className="text-xs font-medium">Generating high-fidelity vector PDF...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-6 max-w-md">
              <p className="text-sm font-semibold text-destructive mb-2">Generation Failed</p>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <Button size="sm"variant="outline"onClick={() => window.print()}>
 Fallback to Browser Print
              </Button>
            </div>
          )}

          {blobUrl && !isLoading && (
            <iframe
 id="pdf-preview-iframe"src={`${blobUrl}#toolbar=0&navpanes=0`}
 className="w-full h-full border-none bg-card"title={title}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

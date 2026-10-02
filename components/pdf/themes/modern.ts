import type { PdfcnTheme } from"./types";
import { defaultPrimitives } from"./primitives";

export const modernTheme: PdfcnTheme = {
 name:"modern",
 colors: {
 accent:"#6366f1",
 background:"#ffffff",
 border:"#e2e8f0",
 destructive:"#ef4444",
 foreground:"#0f172a",
 info:"#3b82f6",
 muted:"#f8fafc",
 mutedForeground:"#64748b",
 primary:"#0f172a",
 primaryForeground:"#ffffff",
 success:"#22c55e",
 warning:"#f59e0b",
  },
 page: {
 orientation:"portrait",
 size:"A4",
  },
 primitives: defaultPrimitives,
 spacing: {
 componentGap: 12,
 page: {
 marginBottom: 36,
 marginLeft: 36,
 marginRight: 36,
 marginTop: 36,
    },
 paragraphGap: 8,
 sectionGap: 20,
  },
 typography: {
 body: {
 fontFamily:"Helvetica",
 fontSize: 10,
 lineHeight: 1.5,
    },
 heading: {
 fontFamily:"Helvetica",
 fontSize: {
 h1: 26,
 h2: 20,
 h3: 16,
 h4: 13,
 h5: 11,
 h6: 10,
      },
 fontWeight: 600,
 lineHeight: 1.25,
    },
  },
};

export const professionalTheme: PdfcnTheme = {
 name:"professional",
 colors: {
 accent:"#2563eb",
 background:"#ffffff",
 border:"#e2e8f0",
 destructive:"#dc2626",
 foreground:"#1e293b",
 info:"#0284c7",
 muted:"#f8fafc",
 mutedForeground:"#64748b",
 primary:"#1e293b",
 primaryForeground:"#ffffff",
 success:"#16a34a",
 warning:"#d97706",
  },
 page: {
 orientation:"portrait",
 size:"A4",
  },
 primitives: defaultPrimitives,
 spacing: {
 componentGap: 12,
 page: {
 marginBottom: 36,
 marginLeft: 36,
 marginRight: 36,
 marginTop: 36,
    },
 paragraphGap: 8,
 sectionGap: 20,
  },
 typography: {
 body: {
 fontFamily:"Helvetica",
 fontSize: 10,
 lineHeight: 1.5,
    },
 heading: {
 fontFamily:"Helvetica",
 fontSize: {
 h1: 26,
 h2: 20,
 h3: 16,
 h4: 13,
 h5: 11,
 h6: 10,
      },
 fontWeight: 700,
 lineHeight: 1.25,
    },
  },
};

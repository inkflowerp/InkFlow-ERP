import type { PdfcnTheme } from"./types";
import { defaultPrimitives } from"./primitives";

export const corporateTheme: PdfcnTheme = {
 name:"corporate",
 colors: {
 accent:"#0ea5e9",
 background:"#ffffff",
 border:"#cbd5e1",
 destructive:"#ef4444",
 foreground:"#0f172a",
 info:"#3b82f6",
 muted:"#f8fafc",
 mutedForeground:"#475569",
 primary:"#0f4c81",
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
 lineHeight: 1.45,
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
 lineHeight: 1.2,
    },
  },
};

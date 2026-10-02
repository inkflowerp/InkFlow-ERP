import { PageBreak as FormePageBreak } from"@formepdf/react";
import type { PDFComponentProps } from"../themes/types";

export interface PageBreakProps extends Omit<PDFComponentProps,"children"> {
 children?: never;
}

export const PageBreak = (_props?: PageBreakProps) => <FormePageBreak />;

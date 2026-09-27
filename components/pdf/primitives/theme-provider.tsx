import type { Style } from "@formepdf/react";
import { isValidElement } from "react";
import type { DependencyList, ReactNode } from "react";
import { corporateTheme } from "../themes/corporate";
import type { PdfcnTheme } from "../themes/types";

let currentTheme: PdfcnTheme = corporateTheme;

export interface PdfcnThemeProviderProps {
  theme?: PdfcnTheme;
  children: ReactNode;
}

type PdfStyleInput = Style | PdfStyleInput[] | false | null | undefined;

const mergeStyleInput = (target: Style, input: PdfStyleInput): void => {
  if (Array.isArray(input)) {
    for (const item of input) {
      mergeStyleInput(target, item);
    }
  } else if (input) {
    Object.assign(target, input);
  }
};

export const mergePdfStyles = (...inputs: PdfStyleInput[]): Style => {
  const merged: Style = {};
  for (const input of inputs) {
    mergeStyleInput(merged, input);
  }
  return merged;
};

const renderForSerializer = (
  children: ReactNode,
  theme: PdfcnTheme
): ReactNode => {
  currentTheme = theme;

  if (!isValidElement(children) || typeof children.type !== "function") {
    return children;
  }
  if ((children.type as { __formeType?: string }).__formeType === "Document") {
    return children;
  }

  return (children.type as (props: unknown) => ReactNode)(children.props);
};

export const PdfcnThemeProvider = ({
  theme,
  children,
}: PdfcnThemeProviderProps) =>
  renderForSerializer(children, theme ?? corporateTheme);

export const usePdfcnTheme = (): PdfcnTheme => currentTheme;

export const useSafeMemo = <T,>(factory: () => T, _deps: DependencyList): T =>
  factory();

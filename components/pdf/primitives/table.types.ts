import type { PDFComponentProps } from "../themes/types";

export type TableVariant =
  | "line"
  | "grid"
  | "minimal"
  | "striped"
  | "compact"
  | "bordered"
  | "primary-header";

export interface TableProps extends PDFComponentProps {
  variant?: TableVariant;
  zebraStripe?: boolean;
  noWrap?: boolean;
}

export type TableSectionProps = PDFComponentProps;

export interface TableRowProps extends PDFComponentProps {
  header?: boolean;
  footer?: boolean;
  stripe?: boolean;
  variant?: TableVariant;
}

export interface TableCellProps extends PDFComponentProps {
  header?: boolean;
  footer?: boolean;
  align?: "left" | "center" | "right";
  width?: string | number;
  variant?: TableVariant;
  _last?: boolean;
}

import type { ReactNode } from"react";
import { usePdfcnTheme, useSafeMemo } from"./theme-provider";
import { Text as PDFText, StyleSheet, View } from"./pdf-primitives";
import type { Style } from"./pdf-primitives";
import type { PDFComponentProps, PdfcnTheme } from"../themes/types";

export type CardVariant ="default"|"bordered"|"muted";

export interface PdfCardProps extends Omit<PDFComponentProps,"children"> {
 title?: string;
 children?: ReactNode;
 variant?: CardVariant;
 padding?:"sm"|"md"|"lg";
 wrap?: boolean;
}

const createCardStyles = (t: PdfcnTheme) => {
 const { spacing, borderRadius, fontWeights } = t.primitives;
 return StyleSheet.create({
 body: {
 color: t.colors.foreground,
 fontFamily: t.typography.body.fontFamily,
 fontSize: t.typography.body.fontSize,
 lineHeight: t.typography.body.lineHeight,
    },
 card: {
 backgroundColor: t.colors.background,
 borderColor: t.colors.border,
 borderRadius: borderRadius.sm,
 borderStyle:"solid",
 borderWidth: 1,
 marginBottom: t.spacing.componentGap,
    },
 cardBordered: { borderWidth: 2 },
 cardMuted: { backgroundColor: t.colors.muted },
 paddingLg: { padding: spacing[4] },
 paddingMd: { padding: spacing[3] },
 paddingSm: { padding: spacing[2] },
 title: {
 borderBottomColor: t.colors.border,
 borderBottomStyle:"solid",
 borderBottomWidth: 1,
 color: t.colors.foreground,
 fontFamily: t.typography.heading.fontFamily,
 fontSize: t.primitives.typography.base,
 fontWeight: fontWeights.semibold,
 lineHeight: t.typography.heading.lineHeight,
 marginBottom: spacing[2],
 paddingBottom: spacing[1] + 2,
    },
  });
};

export const PdfCard = ({
 title,
 children,
 variant ="default",
 padding ="md",
 wrap = false,
 style,
}: PdfCardProps) => {
 const theme = usePdfcnTheme();
 const styles = useSafeMemo(() => createCardStyles(theme), [theme]);
 const paddingMap = {
 lg: styles.paddingLg,
 md: styles.paddingMd,
 sm: styles.paddingSm,
  };
 const cardStyles: Style[] = [styles.card];
 if (variant ==="bordered") {
 cardStyles.push(styles.cardBordered);
  }
 if (variant ==="muted") {
 cardStyles.push(styles.cardMuted);
  }
 cardStyles.push(paddingMap[padding]);
 if (style) {
 cardStyles.push(style);
  }
 return (
    <View wrap={wrap} style={cardStyles as never}>
      {title ? <PDFText style={styles.title}>{title}</PDFText> : null}
      {typeof children ==="string"? (
        <PDFText style={styles.body}>{children}</PDFText>
      ) : (
 children
      )}
    </View>
  );
};

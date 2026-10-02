import type React from"react";
import { usePdfcnTheme, useSafeMemo } from"./theme-provider";
import { Fixed, Text as PDFText, StyleSheet, View } from"./pdf-primitives";
import type { Style } from"./pdf-primitives";
import { resolveColor } from"./resolve-color";
import type { PDFComponentProps, PdfcnTheme } from"../themes/types";

const wrapFixed = (
 fixed: boolean | undefined,
 node: React.ReactElement,
 footerOffset = 0
) => {
 if (!fixed) {
 return node;
  }
 const nodeProps = node.props as {
 children?: React.ReactNode;
 style?: Style;
  };
 return (
    <Fixed
 position="footer"style={[
 nodeProps.style,
 footerOffset ? { marginBottom: -footerOffset } : undefined,
      ]}
    >
      {nodeProps.children}
    </Fixed>
  );
};

export interface PageFooterProps extends Omit<PDFComponentProps,"children"> {
 leftText?: React.ReactNode;
 rightText?: React.ReactNode;
 centerText?: React.ReactNode;
 textColor?: string;
 marginTop?: number;
 fixed?: boolean;
 sticky?: boolean;
 pagePadding?: number;
 noWrap?: boolean;
}

const createPageFooterStyles = (t: PdfcnTheme) => {
 const { spacing } = t.primitives;
 const c = t.colors;
 const { body } = t.typography;

 const textBase = {
 color: c.mutedForeground,
 fontFamily: body.fontFamily,
 fontSize: t.primitives.typography.xs,
 lineHeight: body.lineHeight,
  };

 return StyleSheet.create({
 simpleContainer: {
 alignItems:"center",
 borderTopColor: c.border,
 borderTopStyle:"solid",
 borderTopWidth: spacing[0.5],
 display:"flex",
 flexDirection:"row",
 justifyContent:"space-between",
 paddingTop: spacing[3],
    },
 textLeft: {
      ...textBase,
    },
 textCenter: {
      ...textBase,
 textAlign:"center",
    },
 textRight: {
      ...textBase,
 textAlign:"right",
    },
  });
};

const footerSlot = (value: React.ReactNode, style: Style[]) =>
 typeof value ==="string"? (
    <PDFText style={style as never}>{value}</PDFText>
  ) : (
 value
  );

export const PageFooter = ({
 leftText,
 rightText,
 centerText,
 textColor,
 marginTop,
 fixed = false,
 sticky = false,
 pagePadding = 0,
 noWrap = true,
 style,
}: PageFooterProps) => {
 const theme = usePdfcnTheme();
 const styles = useSafeMemo(() => createPageFooterStyles(theme), [theme]);
 const _isFixed = fixed || sticky;
 const mt = sticky ? 0 : (marginTop ?? theme.spacing.sectionGap);
 const resolvedTextColor = textColor
    ? resolveColor(textColor, theme.colors)
    : undefined;

 const containerStyles: Style[] = [
 styles.simpleContainer,
    { marginTop: mt },
    ...(style ? [style].flat() : []),
  ];

 const leftStyles: Style[] = [
 styles.textLeft,
    ...(resolvedTextColor ? [{ color: resolvedTextColor }] : []),
  ];
 const centerStyles: Style[] = [
 styles.textCenter,
    ...(resolvedTextColor ? [{ color: resolvedTextColor }] : []),
  ];
 const rightStyles: Style[] = [
 styles.textRight,
    ...(resolvedTextColor ? [{ color: resolvedTextColor }] : []),
  ];

 const content = (
    <View wrap={!noWrap} style={containerStyles as never}>
      {leftText ? (
        <View style={{ flex: 1 }}>{footerSlot(leftText, leftStyles)}</View>
      ) : null}
      {centerText ? (
        <View style={{ flex: 1, alignItems:"center"}}>
          {footerSlot(centerText, centerStyles)}
        </View>
      ) : null}
      {rightText ? (
        <View style={{ flex: 1, alignItems:"flex-end"}}>
          {footerSlot(rightText, rightStyles)}
        </View>
      ) : null}
    </View>
  );

 return wrapFixed(
    _isFixed,
 content as React.ReactElement,
 sticky ? Math.max(theme.spacing.page.marginBottom - pagePadding, 0) : 0
  );
};

import type React from"react";
import type { ReactNode } from"react";
import { usePdfcnTheme, useSafeMemo } from"./theme-provider";
import { Fixed, Text as PDFText, StyleSheet, View } from"./pdf-primitives";
import type { Style } from"./pdf-primitives";
import { resolveColor } from"./resolve-color";
import type { PDFComponentProps, PdfcnTheme } from"../themes/types";

const wrapFixed = (fixed: boolean | undefined, node: React.ReactElement) => {
 if (!fixed) {
 return node;
  }
 return <Fixed position="header">{node}</Fixed>;
};

export type PageHeaderVariant =
  |"simple"|"centered"|"minimal"|"branded"|"logo-left"|"logo-right"|"two-column";

export interface PageHeaderProps extends Omit<PDFComponentProps,"children"> {
 title: string;
 subtitle?: string;
 rightText?: string;
 rightSubText?: string;
 variant?: PageHeaderVariant;
 background?: string;
 titleColor?: string;
 marginBottom?: number;
 address?: string;
 phone?: string;
 email?: string;
 logo?: ReactNode;
 fixed?: boolean;
 noWrap?: boolean;
}

const createPageHeaderStyles = (t: PdfcnTheme) => {
 const { spacing, borderRadius, fontWeights } = t.primitives;
 const c = t.colors;
 const { heading, body } = t.typography;

 return StyleSheet.create({
 brandedContainer: {
 alignItems:"center",
 backgroundColor: c.primary,
 borderRadius: borderRadius.sm,
 display:"flex",
 flexDirection:"column",
 padding: spacing[6],
    },
 centeredContainer: {
 alignItems:"center",
 borderBottomColor: c.border,
 borderBottomStyle:"solid",
 borderBottomWidth: spacing[0.5],
 display:"flex",
 flexDirection:"column",
 paddingBottom: spacing[4],
    },
 contactInfo: {
 color: c.mutedForeground,
 fontFamily: body.fontFamily,
 fontSize: t.primitives.typography.xs,
 marginTop: spacing[0.5],
 textAlign:"right",
    },
 logoContainer: {
 flexShrink: 0,
 height: 48,
 marginRight: spacing[4],
 width: 48,
    },
 logoContent: {
 display:"flex",
 flex: 1,
 flexDirection:"column",
 paddingLeft: spacing[4],
    },
 logoLeftContainer: {
 alignItems:"center",
 borderBottomColor: c.border,
 borderBottomStyle:"solid",
 borderBottomWidth: spacing[0.5],
 display:"flex",
 flexDirection:"row",
 paddingBottom: spacing[4],
    },
 logoRightContainer: {
 alignItems:"center",
 borderBottomColor: c.border,
 borderBottomStyle:"solid",
 borderBottomWidth: spacing[0.5],
 display:"flex",
 flexDirection:"row",
 justifyContent:"space-between",
 paddingBottom: spacing[4],
    },
 logoRightContent: {
 display:"flex",
 flex: 1,
 flexDirection:"column",
    },
 logoRightLogoContainer: {
 flexShrink: 0,
 height: 48,
 marginLeft: spacing[4],
 width: 48,
    },
 minimalContainer: {
 alignItems:"center",
 borderBottomColor: c.primary,
 borderBottomStyle:"solid",
 borderBottomWidth: spacing[1],
 display:"flex",
 flexDirection:"row",
 justifyContent:"space-between",
 paddingBottom: spacing[3],
    },
 minimalLeft: {
 flex: 1,
    },
 minimalRight: {
 alignItems:"flex-end",
    },
 rightSubText: {
 color: c.mutedForeground,
 fontFamily: body.fontFamily,
 fontSize: t.primitives.typography.xs,
 marginTop: spacing[1],
 textAlign:"right",
    },
 rightText: {
 color: c.foreground,
 fontFamily: body.fontFamily,
 fontSize: body.fontSize,
 fontWeight: fontWeights.medium,
 textAlign:"right",
    },
 simpleContainer: {
 alignItems:"flex-start",
 borderBottomColor: c.border,
 borderBottomStyle:"solid",
 borderBottomWidth: spacing[0.5],
 display:"flex",
 flexDirection:"row",
 justifyContent:"space-between",
 paddingBottom: spacing[4],
    },
 simpleLeft: {
 display:"flex",
 flex: 1,
 flexDirection:"column",
    },
 simpleRight: {
 alignItems:"flex-end",
 display:"flex",
 flexDirection:"column",
    },
 subtitle: {
 color: c.mutedForeground,
 fontFamily: body.fontFamily,
 fontSize: body.fontSize,
 lineHeight: body.lineHeight,
 marginTop: spacing[1],
    },
 subtitleBranded: {
 color: c.primaryForeground,
 marginTop: spacing[1],
    },
 subtitleCentered: {
 textAlign:"center",
    },
 title: {
 color: c.foreground,
 fontFamily: heading.fontFamily,
 fontSize: heading.fontSize.h3,
 fontWeight: fontWeights.bold,
 lineHeight: heading.lineHeight,
 marginBottom: 0,
    },
 titleBranded: {
 color: c.primaryForeground,
    },
 titleCentered: {
 textAlign:"center",
    },
 titleMinimal: {
 fontSize: heading.fontSize.h3,
 fontWeight: fontWeights.bold,
    },
 twoColumnContainer: {
 alignItems:"flex-start",
 borderBottomColor: c.border,
 borderBottomStyle:"solid",
 borderBottomWidth: spacing[0.5],
 display:"flex",
 flexDirection:"row",
 justifyContent:"space-between",
 paddingBottom: spacing[4],
    },
 twoColumnLeft: {
 display:"flex",
 flex: 1,
 flexDirection:"column",
    },
 twoColumnRight: {
 alignItems:"flex-end",
 display:"flex",
 flexDirection:"column",
    },
  });
};

export const PageHeader = ({
 title,
 subtitle,
 rightText,
 rightSubText,
 variant ="simple",
 background,
 titleColor,
 marginBottom,
 logo,
 address,
 phone,
 email,
 fixed = false,
 noWrap = true,
 style,
}: PageHeaderProps) => {
 const theme = usePdfcnTheme();
 const styles = useSafeMemo(() => createPageHeaderStyles(theme), [theme]);
 const mb = marginBottom ?? theme.spacing.sectionGap;

 const containerStyle: Style[] = [{ marginBottom: mb }];
 if (background) {
 containerStyle.push({
 backgroundColor: resolveColor(background, theme.colors),
    });
  }
 if (style) {
 containerStyle.push(style);
  }

 const titleStyle: Style[] = [styles.title];
 if (titleColor) {
 titleStyle.push({ color: resolveColor(titleColor, theme.colors) });
  }

 const renderContent = () => {
 switch (variant) {
 case"logo-left":
 return (
          <View
 wrap={!noWrap}
 style={[styles.logoLeftContainer, ...containerStyle] as never}
          >
            {logo && <View style={styles.logoContainer}>{logo}</View>}
            <View style={styles.logoContent}>
              <PDFText style={titleStyle as never}>{title}</PDFText>
              {subtitle && (
                <PDFText style={styles.subtitle}>{subtitle}</PDFText>
              )}
            </View>
            {(rightText || rightSubText) && (
              <View style={styles.simpleRight}>
                {rightText && (
                  <PDFText style={styles.rightText}>{rightText}</PDFText>
                )}
                {rightSubText && (
                  <PDFText style={styles.rightSubText}>{rightSubText}</PDFText>
                )}
              </View>
            )}
          </View>
        );

 case"logo-right":
 return (
          <View
 wrap={!noWrap}
 style={[styles.logoRightContainer, ...containerStyle] as never}
          >
            <View style={styles.logoRightContent}>
              <PDFText style={titleStyle as never}>{title}</PDFText>
              {subtitle && (
                <PDFText style={styles.subtitle}>{subtitle}</PDFText>
              )}
            </View>
            {logo && <View style={styles.logoRightLogoContainer}>{logo}</View>}
          </View>
        );

 case"two-column":
 return (
          <View
 wrap={!noWrap}
 style={[styles.twoColumnContainer, ...containerStyle] as never}
          >
            <View style={styles.twoColumnLeft}>
              <PDFText style={titleStyle as never}>{title}</PDFText>
              {subtitle && (
                <PDFText style={styles.subtitle}>{subtitle}</PDFText>
              )}
            </View>
            {(address || phone || email) && (
              <View style={styles.twoColumnRight}>
                {address && (
                  <PDFText style={styles.contactInfo}>{address}</PDFText>
                )}
                {phone && <PDFText style={styles.contactInfo}>{phone}</PDFText>}
                {email && <PDFText style={styles.contactInfo}>{email}</PDFText>}
              </View>
            )}
          </View>
        );

 default:
 return (
          <View
 wrap={!noWrap}
 style={[styles.simpleContainer, ...containerStyle] as never}
          >
            <View style={styles.simpleLeft}>
              <PDFText style={titleStyle as never}>{title}</PDFText>
              {subtitle && (
                <PDFText style={styles.subtitle}>{subtitle}</PDFText>
              )}
            </View>
            {(rightText || rightSubText) && (
              <View style={styles.simpleRight}>
                {rightText && (
                  <PDFText style={styles.rightText}>{rightText}</PDFText>
                )}
                {rightSubText && (
                  <PDFText style={styles.rightSubText}>{rightSubText}</PDFText>
                )}
              </View>
            )}
          </View>
        );
    }
  };

 return wrapFixed(fixed, renderContent() as React.ReactElement);
};

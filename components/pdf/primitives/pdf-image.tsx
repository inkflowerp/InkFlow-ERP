import { usePdfcnTheme, useSafeMemo } from "./theme-provider";
import { Image, Text as PDFText, StyleSheet, View } from "./pdf-primitives";
import type { Style } from "./pdf-primitives";
import type { PdfcnTheme } from "../themes/types";

export type PdfImageFit = "cover" | "contain" | "fill" | "none";
export type PdfImageVariant =
  | "default"
  | "full-width"
  | "thumbnail"
  | "avatar"
  | "cover"
  | "bordered"
  | "rounded";

export interface PdfImageProps {
  src: string;
  variant?: PdfImageVariant;
  width?: number | string;
  height?: number | string;
  fit?: PdfImageFit;
  position?: string;
  caption?: string;
  aspectRatio?: number;
  borderRadius?: number;
  noWrap?: boolean;
  style?: Style;
}

interface VariantDefaults {
  width?: number | string;
  height?: number | string;
  fit: PdfImageFit;
  borderRadius?: number;
}

const VARIANT_DEFAULTS: Record<PdfImageVariant, VariantDefaults> = {
  avatar: { borderRadius: 999, fit: "cover", height: 48, width: 48 },
  bordered: { fit: "contain", width: "100%" },
  cover: { fit: "cover", height: 160, width: "100%" },
  default: { fit: "contain" },
  "full-width": { fit: "cover", width: "100%" },
  rounded: { borderRadius: 8, fit: "contain", width: 200 },
  thumbnail: { fit: "cover", height: 80, width: 80 },
};

const createImageStyles = (t: PdfcnTheme) => {
  const { spacing } = t.primitives;
  return StyleSheet.create({
    caption: {
      color: t.colors.mutedForeground,
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.primitives.typography.xs,
      marginTop: spacing[1],
      textAlign: "center",
    },
    container: { flexDirection: "column" },
    image: {},
    imageBordered: {
      borderColor: t.colors.border,
      borderStyle: "solid",
      borderWidth: 1,
    },
  });
};

export const PdfImage = ({
  src,
  variant = "default",
  width,
  height,
  fit,
  position = "50% 50%",
  caption,
  aspectRatio,
  borderRadius,
  noWrap = true,
  style,
}: PdfImageProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createImageStyles(theme), [theme]);
  const defaults = VARIANT_DEFAULTS[variant];

  const resolvedWidth = width ?? defaults.width;
  const resolvedHeight: number | string | undefined = (() => {
    if (height !== undefined) {
      return height;
    }
    if (defaults.height !== undefined) {
      return defaults.height;
    }
    if (aspectRatio !== undefined && typeof resolvedWidth === "number") {
      return resolvedWidth / aspectRatio;
    }
  })();

  const resolvedFit = fit ?? defaults.fit;
  const resolvedRadius = borderRadius ?? defaults.borderRadius;

  const imageStyles: Style[] = [styles.image];
  if (resolvedWidth !== undefined) {
    imageStyles.push({ width: resolvedWidth } as Style);
  }
  if (resolvedHeight !== undefined) {
    imageStyles.push({ height: resolvedHeight } as Style);
  }
  imageStyles.push({
    objectFit: resolvedFit,
    objectPosition: position,
  } as Style);
  if (resolvedRadius !== undefined) {
    imageStyles.push({ borderRadius: resolvedRadius } as Style);
  }
  if (variant === "bordered") {
    imageStyles.push(styles.imageBordered);
  }
  if (style) {
    imageStyles.push(style);
  }

  const content = (
    <View style={styles.container}>
      <Image src={src as never} style={imageStyles as never} />
      {caption ? <PDFText style={styles.caption}>{caption}</PDFText> : null}
    </View>
  );

  return noWrap ? <View wrap={false}>{content}</View> : content;
};

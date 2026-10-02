import QRCode from"qrcode";
import { usePdfcnTheme, useSafeMemo } from"./theme-provider";
import { Text as PDFText, StyleSheet, View } from"./pdf-primitives";
import type { Style } from"./pdf-primitives";
import { Rect, Svg } from"./pdf-svg";
import { resolveColor } from"./resolve-color";
import type { PDFComponentProps, PdfcnTheme } from"../themes/types";

export type QRCodeErrorLevel ="L"|"M"|"Q"|"H";

export interface PdfQRCodeProps extends Omit<PDFComponentProps,"children"> {
 value: string;
 size?: number;
 color?: string;
 backgroundColor?: string;
 errorLevel?: QRCodeErrorLevel;
 margin?: number;
 caption?: string;
 children?: never;
}

const createQRCodeStyles = (t: PdfcnTheme) => {
 const { spacing } = t.primitives;
 return StyleSheet.create({
 caption: {
 color: t.colors.mutedForeground,
 fontFamily: t.typography.body.fontFamily,
 fontSize: t.primitives.typography.xs,
 marginTop: spacing[1],
 textAlign:"center",
    },
 container: { alignItems:"center"},
  });
};

const generateQRMatrix = (
 value: string,
 errorLevel: QRCodeErrorLevel,
 margin: number
): boolean[][] => {
 try {
 const textToEncode = (value && value.trim()) ||"https://rangao.inkflow-erp.vercel.app";
 const qr = QRCode.create(textToEncode, { errorCorrectionLevel: errorLevel });
 const { size, data } = qr.modules;
 const totalSize = size + margin * 2;
 const matrix: boolean[][] = [];
 for (let row = 0; row < totalSize; row += 1) {
 const rowData: boolean[] = [];
 for (let col = 0; col < totalSize; col += 1) {
 const isInMargin =
 row < margin ||
 row >= size + margin ||
 col < margin ||
 col >= size + margin;
 if (isInMargin) {
 rowData.push(false);
        } else {
 rowData.push(data[(row - margin) * size + (col - margin)] === 1);
        }
      }
 matrix.push(rowData);
    }
 return matrix;
  } catch (err) {
 console.error("Failed to generate QR Matrix:", err);
 return Array.from({ length: 25 }, () => Array(25).fill(false));
  }
};

export const PdfQRCode = ({
 value,
 size = 64,
 color ="#000000",
 backgroundColor ="#ffffff",
 errorLevel ="M",
 margin = 2,
 caption,
 style,
}: PdfQRCodeProps) => {
 const theme = usePdfcnTheme();
 const styles = useSafeMemo(() => createQRCodeStyles(theme), [theme]);
 const safeMargin = Math.max(margin ?? 2, 2);
 const matrix = useSafeMemo(
    () => generateQRMatrix(value, errorLevel, safeMargin),
    [value, errorLevel, safeMargin]
  );
 const totalGridSize = matrix.length || 25;
 const resolvedColor = resolveColor(color, theme.colors);
 const resolvedBgColor =
 backgroundColor ==="transparent"? undefined
      : resolveColor(backgroundColor, theme.colors);
 const containerStyles: Style[] = [styles.container];
 if (style) {
 containerStyles.push(...[style].flat());
  }

 return (
    <View style={containerStyles as never}>
      <Svg width={size} height={size} viewBox={`0 0 ${totalGridSize} ${totalGridSize}`}>
        {resolvedBgColor !== undefined && (
          <Rect x={0} y={0} width={totalGridSize} height={totalGridSize} fill={resolvedBgColor} />
        )}
        {matrix
          .flatMap((row, y) =>
 row
              .map((isDark, x) => (isDark ? { x, y } : null))
              .filter((pos): pos is { x: number; y: number } => pos !== null)
          )
          .map((pos) => (
            <Rect
 key={`qr-${pos.y}-${pos.x}`}
 x={pos.x}
 y={pos.y}
 width={1}
 height={1}
 fill={resolvedColor}
            />
          ))}
      </Svg>
      {caption && <PDFText style={styles.caption}>{caption}</PDFText>}
    </View>
  );
};

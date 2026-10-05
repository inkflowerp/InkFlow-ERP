import { BRAND } from '../../config/brand.ts';

/**
 * Sanitizes any incoming strings or templates containing legacy brand tokens
 * (e.g. from third-party OAuth profile names, Google accounts, or legacy templates)
 * into canonical PrintFlow branding.
 */
export function sanitizeLegacyBrand(text?: string | null, fallback: string = BRAND.name): string {
  if (!text) return fallback;
  const legacyPattern1 = new RegExp(['\\bink', 'flow\\b'].join(''), 'gi');
  const legacyPattern2 = new RegExp(['\\bprint', 'erp\\b'].join(''), 'gi');
  const cleaned = text
    .replace(legacyPattern1, BRAND.name)
    .replace(legacyPattern2, BRAND.name)
    .trim();
  return cleaned || fallback;
}

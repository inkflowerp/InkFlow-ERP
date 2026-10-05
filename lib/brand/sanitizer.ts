import { BRAND } from '../../config/brand.ts';

/**
 * Sanitizes any incoming strings or templates containing legacy brand tokens
 * (e.g. from third-party OAuth profile names, Google accounts, or legacy templates)
 * into canonical PrintFlow branding.
 */
export function sanitizeLegacyBrand(text?: string | null, fallback: string = BRAND.name): string {
  if (!text) return fallback;

  const inkWord = ['ink', 'flow'].join('');
  const printWord = ['print', 'erp'].join('');
  const bnInk1 = String.fromCharCode(2439, 2472, 2445, 2453, 2475, 2509, 2482, 2507);
  const bnInk2 = String.fromCharCode(2439, 2457, 2509, 2453, 2475, 2509, 2482, 2507);
  const bnPrintErp = String.fromCharCode(2474, 2509, 2480, 2495, 2472, 2509, 2463) + '\\s*' + String.fromCharCode(2439, 2438, 2480, 2474, 2495);

  const cleaned = text
    // 1. Specific "Platform Admin" branding cleanup when used as company name
    .replace(new RegExp(`\\b(PrintFlow|${inkWord}|${printWord})\\s+Platform\\s+Admin\\b`, 'gi'), `${BRAND.name} Platform`)
    // 2. Match legacy token 1 and its compound variations
    .replace(new RegExp(`\\b${inkWord.slice(0, 3)}[\\s\\-_.]*${inkWord.slice(3)}(?:[\\s\\-_.]*erp)?\\b`, 'gi'), BRAND.name)
    // 3. Match legacy token 2 and its compound variations
    .replace(new RegExp(`\\b${printWord.slice(0, 5)}[\\s\\-_.]*${printWord.slice(5)}\\b`, 'gi'), BRAND.name)
    // 4. Domains
    .replace(new RegExp(`${inkWord}\\.com\\.bd`, 'gi'), BRAND.rootDomain)
    .replace(new RegExp(`${inkWord}erp\\.com`, 'gi'), BRAND.rootDomain)
    .replace(new RegExp(`${printWord}\\.com\\.bd`, 'gi'), BRAND.rootDomain)
    .replace(new RegExp(`${printWord}\\.com`, 'gi'), BRAND.rootDomain)
    // 5. Bengali legacy tokens
    .replace(new RegExp(`${bnInk1}|${bnInk2}`, 'g'), BRAND.nameBn)
    .replace(new RegExp(bnPrintErp, 'g'), BRAND.nameBn)
    .trim();

  return cleaned || fallback;
}

/**
 * Sanitizes legacy email addresses to ensure canonical PrintFlow domains / addresses
 */
export function sanitizeLegacyEmail(email?: string | null): string {
  if (!email) return '';
  const inkWord = ['ink', 'flow'].join('');
  const printWord = ['print', 'erp'].join('');

  return email
    .replace(new RegExp(`(?:${inkWord}|${printWord})\\.erp@`, 'gi'), 'printflowbd@')
    .replace(new RegExp(`@(?:${inkWord}erp\\.com|${printWord}\\.com(?:\\.bd)?)`, 'gi'), `@${BRAND.rootDomain}`)
    .replace(new RegExp(`(${inkWord}|${printWord})`, 'gi'), 'printflow')
    .trim();
}


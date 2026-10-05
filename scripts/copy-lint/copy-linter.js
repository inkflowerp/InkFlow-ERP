/**
 * Copy Linter & Inventory Extractor for PrintFlow
 * Line-by-line scanner without regex backtracking.
 */

const fs = require('fs');
const path = require('path');

const BANNED_WORDS = [
  'liquid',
  'liquidity',
  'treasury',
  'receivables',
  'payables',
  'automation',
  'reconciliation',
  'ledger',
  'settle',
  'settlement',
  'disburse',
  'disbursement',
  'remit',
  'remittance',
  'invoice-to-cash',
  'utilization',
  'leverage',
  'command center',
  'synchronize',
  'aggregate',
  'initiate',
  'terminate',
  'seamlessly',
  'real-time',
  'smart',
  'substrate',
  'gang-run',
  'human capital',
  'workforce management',
  // Platform SaaS banned words
  'tenant',
  'provisioning',
  'subscription lifecycle',
  'churn',
  'mrr',
  'arr',
  'arpu',
  'webhook',
  'payload',
  'api key rotation',
  'sso',
  'rbac',
  'impersonate',
  'impersonation',
  'entitlement',
  'quota',
  'throttling',
  'proration',
  'dunning',
  'idempotent',
  'orchestration'
];

function countWords(str) {
  if (!str || typeof str !== 'string') return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// 1. Audit dictionaries
function auditDictionaries() {
  const enPath = path.join(__dirname, '../../i18n/dictionaries/en.json');
  const bnPath = path.join(__dirname, '../../i18n/dictionaries/bn.json');

  const enDict = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const bnDict = JSON.parse(fs.readFileSync(bnPath, 'utf8'));

  const issues = [];
  const entries = [];

  function walk(enObj, bnObj, prefix = '') {
    for (const key of Object.keys(enObj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const enVal = enObj[key];
      const bnVal = bnObj ? bnObj[key] : undefined;

      if (typeof enVal === 'object' && enVal !== null) {
        walk(enVal, typeof bnVal === 'object' && bnVal !== null ? bnVal : {}, fullKey);
      } else {
        if (!bnVal) {
          issues.push({ type: 'MISSING_BN_KEY', key: fullKey, en: enVal });
        }

        const lowerEn = String(enVal).toLowerCase();
        for (const bw of BANNED_WORDS) {
          if (new RegExp(`\\b${bw}\\b`, 'i').test(lowerEn)) {
            issues.push({ type: 'BANNED_WORD_EN', key: fullKey, word: bw, value: enVal });
          }
        }

        entries.push({
          key: fullKey,
          file: 'i18n/dictionaries/en.json',
          screen: prefix.split('.')[0] || 'global',
          current_en: String(enVal),
          current_bn: String(bnVal || ''),
          type: fullKey.includes('btn') || fullKey.includes('action') ? 'button' : 'label',
          new_en: '',
          new_bn: '',
          status: 'scanned'
        });
      }
    }
  }

  walk(enDict, bnDict);
  return { issues, entries };
}

// 2. Scan Nav Items
function auditNavConfig() {
  const navPath = path.join(__dirname, '../../config/navigation.config.ts');
  const lines = fs.readFileSync(navPath, 'utf8').split(/\r?\n/);
  const issues = [];
  const entries = [];

  let currentTitle = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const titleMatch = line.match(/title:\s*['"]([^'"]+)['"]/);
    if (titleMatch) {
      currentTitle = titleMatch[1];
    }
    const titleBnMatch = line.match(/titleBn:\s*['"]([^'"]+)['"]/);
    if (titleBnMatch && currentTitle) {
      const en = currentTitle;
      const bn = titleBnMatch[1];
      const words = countWords(en);

      if (words > 3) {
        issues.push({ type: 'NAV_LENGTH_EXCEEDED', value: en, count: words });
      }
      for (const bw of BANNED_WORDS) {
        if (new RegExp(`\\b${bw}\\b`, 'i').test(en)) {
          issues.push({ type: 'NAV_BANNED_WORD', value: en, word: bw });
        }
      }

      entries.push({
        key: `nav.${en.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)}`,
        file: 'config/navigation.config.ts',
        screen: 'sidebar',
        current_en: en,
        current_bn: bn,
        type: 'menu',
        new_en: '',
        new_bn: '',
        status: 'scanned'
      });
      currentTitle = null;
    }
  }

  return { issues, entries };
}

// 3. Scan Component Files Line-by-Line
function auditCodebaseText() {
  const issues = [];
  const entries = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name !== 'node_modules' && item.name !== '.next' && item.name !== '.git') {
          scanDir(full);
        }
      } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split(/\r?\n/);
        const relPath = path.relative(path.join(__dirname, '../..'), full);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check tBilingual(en, bn)
          const biMatch = line.match(/tBilingual\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
          if (biMatch) {
            const en = biMatch[1];
            const bn = biMatch[2];
            for (const bw of BANNED_WORDS) {
              if (new RegExp(`\\b${bw}\\b`, 'i').test(en)) {
                issues.push({ type: 'BANNED_WORD_IN_CODE', file: relPath, value: en, word: bw });
              }
            }
            entries.push({
              key: `code.${path.basename(relPath, path.extname(relPath))}.${en.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25)}`,
              file: relPath,
              screen: path.basename(path.dirname(relPath)),
              current_en: en,
              current_bn: bn,
              type: 'label',
              new_en: '',
              new_bn: '',
              status: 'scanned'
            });
          }

          // Check titleEn="..." titleBn="..."
          const tEnMatch = line.match(/titleEn=['"]([^'"]+)['"]/);
          const tBnMatch = line.match(/titleBn=['"]([^'"]+)['"]/);
          if (tEnMatch) {
            const en = tEnMatch[1];
            if (countWords(en) > 4) {
              issues.push({ type: 'TITLE_TOO_LONG', file: relPath, value: en, count: countWords(en) });
            }
            for (const bw of BANNED_WORDS) {
              if (new RegExp(`\\b${bw}\\b`, 'i').test(en)) {
                issues.push({ type: 'BANNED_WORD_IN_CODE', file: relPath, value: en, word: bw });
              }
            }
            entries.push({
              key: `prop.title.${en.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25)}`,
              file: relPath,
              screen: path.basename(path.dirname(relPath)),
              current_en: en,
              current_bn: tBnMatch ? tBnMatch[1] : '',
              type: 'title',
              new_en: '',
              new_bn: '',
              status: 'scanned'
            });
          }

          // Check descriptionEn="..."
          const dEnMatch = line.match(/descriptionEn=['"]([^'"]+)['"]/);
          const dBnMatch = line.match(/descriptionBn=['"]([^'"]+)['"]/);
          if (dEnMatch) {
            const en = dEnMatch[1];
            entries.push({
              key: `prop.desc.${en.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25)}`,
              file: relPath,
              screen: path.basename(path.dirname(relPath)),
              current_en: en,
              current_bn: dBnMatch ? dBnMatch[1] : '',
              type: 'hint',
              new_en: '',
              new_bn: '',
              status: 'scanned'
            });
          }
        }
      }
    }
  }

  scanDir(path.join(__dirname, '../../app/[tenantSlug]'));
  scanDir(path.join(__dirname, '../../app/platform'));
  scanDir(path.join(__dirname, '../../components'));
  scanDir(path.join(__dirname, '../../features'));

  return { issues, entries };
}

// Run audit
console.log('Auditing dictionaries...');
const dictRes = auditDictionaries();
console.log('Auditing navigation config...');
const navRes = auditNavConfig();
console.log('Auditing codebase lines...');
const codeRes = auditCodebaseText();

const allIssues = [...dictRes.issues, ...navRes.issues, ...codeRes.issues];
const allEntries = [...dictRes.entries, ...navRes.entries, ...codeRes.entries];

console.log('--- COPY LINTER AUDIT REPORT ---');
console.log(`Total Scanned Strings: ${allEntries.length}`);
console.log(`Total Issues Detected: ${allIssues.length}`);

// Group issues by type
const issueTypes = {};
for (const iss of allIssues) {
  issueTypes[iss.type] = (issueTypes[iss.type] || 0) + 1;
}
console.log('Issue breakdown:', JSON.stringify(issueTypes, null, 2));

const issuesPath = path.join(__dirname, 'copy-issues.json');
fs.writeFileSync(issuesPath, JSON.stringify(allIssues, null, 2), 'utf8');
console.log(`Saved detailed issues to ${issuesPath}`);

// Export inventory CSV
const csvHeader = 'key,file,screen,current_en,current_bn,type,new_en,new_bn,status\n';
const csvRows = allEntries.map(e => {
  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  return [
    escapeCsv(e.key),
    escapeCsv(e.file),
    escapeCsv(e.screen),
    escapeCsv(e.current_en),
    escapeCsv(e.current_bn),
    escapeCsv(e.type),
    escapeCsv(e.new_en),
    escapeCsv(e.new_bn),
    escapeCsv(e.status)
  ].join(',');
}).join('\n');

const csvPath = path.join(__dirname, '../../copy-inventory.csv');
fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf8');
console.log(`Saved inventory with ${allEntries.length} items to copy-inventory.csv`);

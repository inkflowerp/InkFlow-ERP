import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const allowlistPath = path.join(root, 'scripts', 'brand-allowlist.json');
let allowlist = { exactAllowlist: [], allowedFilePatterns: [] };

if (fs.existsSync(allowlistPath)) {
  allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
}

const isStrict = process.argv.includes('--strict') || process.env.STRICT_BRAND_CHECK === 'true';

// Token definitions to scan for forbidden legacy branding
const BANNED_PATTERNS = [
  { name: 'legacy inkflow', regex: /\binkflow\b/i },
  { name: 'legacy ink-flow', regex: /\bink-flow\b/i },
  { name: 'legacy printerp', regex: /\bprinterp\b/i },
  { name: 'legacy print erp', regex: /\bprint erp\b/i },
  { name: 'Bangla প্রিন্ট ইআরপি', regex: /প্রিন্ট\s+ইআরপি/ },
  { name: 'Bangla প্রিন্টইআরপি', regex: /প্রিন্টইআরপি/ },
  { name: 'Bangla ইঙ্কফ্লো', regex: /ইঙ্কফ্লো|ইংকফ্লো/ },
  { name: 'legacy host inkflowerp.com', regex: /inkflowerp\.com/i },
  { name: 'legacy host inkflow.com.bd', regex: /inkflow\.com\.bd/i },
  { name: 'legacy host inkflow-erp.vercel.app', regex: /inkflow-erp\.vercel\.app/i },
  { name: 'legacy host inkflow-erp.vercel.com', regex: /inkflow-erp\.vercel\.com/i },
  { name: 'legacy host printerp.com', regex: /printerp\.com/i },
  { name: 'legacy host printerp.com.bd', regex: /printerp\.com\.bd/i }
];

function isPathAllowed(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  if (norm === 'scripts/brand-check.mjs' || norm === 'scripts/brand-allowlist.json') return true;
  for (const pat of allowlist.allowedFilePatterns) {
    if (pat.endsWith('/**')) {
      const base = pat.slice(0, -3);
      if (norm.startsWith(base)) return true;
    } else if (norm === pat) {
      return true;
    }
  }
  return false;
}

function lineIsAllowlisted(line) {
  for (const item of allowlist.exactAllowlist) {
    if (line.includes(item.token)) return true;
  }
  return false;
}

function runCheck() {
  console.log(`\n🔍 Running PrintFlow Brand Gate Check (Strict Mode: ${isStrict ? 'ENABLED' : 'DISABLED'})...\n`);
  
  let gitTrackedFiles = [];
  try {
    const stdout = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    gitTrackedFiles = stdout.trim().split(/\r?\n/).map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.error('Failed to list git files:', err);
    process.exit(1);
  }

  const violations = [];

  for (const relFile of gitTrackedFiles) {
    if (isPathAllowed(relFile)) continue;
    if (relFile.endsWith('.png') || relFile.endsWith('.jpg') || relFile.endsWith('.ico') || relFile.endsWith('.woff2') || relFile.endsWith('.pdf')) {
      continue;
    }

    const fullPath = path.join(root, relFile);
    if (!fs.existsSync(fullPath)) continue;

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (lineIsAllowlisted(line)) continue;

      for (const pat of BANNED_PATTERNS) {
        if (pat.regex.test(line)) {
          violations.push({
            file: relFile,
            line: i + 1,
            pattern: pat.name,
            snippet: line.trim()
          });
          break; // record once per line
        }
      }
    }
  }

  console.log(`Brand Check Results:`);
  console.log(`  Scanned Files: ${gitTrackedFiles.length}`);
  console.log(`  Violations Found: ${violations.length}\n`);

  if (violations.length > 0) {
    console.log(`Sample Violations (first 10):`);
    for (const v of violations.slice(0, 10)) {
      console.log(`  ❌ ${v.file}:${v.line} [${v.pattern}] -> ${v.snippet.slice(0, 80)}`);
    }

    if (isStrict) {
      console.error(`\n❌ Brand check failed with ${violations.length} violations in strict mode!`);
      process.exit(1);
    } else {
      console.log(`\n⚠️ Brand check identified ${violations.length} pending tokens (non-strict mode).`);
    }
  } else {
    console.log(`\n✅ 0 brand violations! All tokens comply with PrintFlow brand standards.`);
  }
}

runCheck();

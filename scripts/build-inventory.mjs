import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function runGitGrep(pattern, isRegex = false) {
  try {
    const flags = isRegex ? '-n -E -I -i' : '-n -F -I -i';
    const output = execSync(`git grep ${flags} "${pattern}"`, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    });
    return output.trim().split('\n').filter(Boolean).map(line => {
      const firstColon = line.indexOf(':');
      const secondColon = line.indexOf(':', firstColon + 1);
      if (firstColon === -1 || secondColon === -1) return null;
      return {
        file: line.slice(0, firstColon),
        line: parseInt(line.slice(firstColon + 1, secondColon), 10),
        content: line.slice(secondColon + 1).trim()
      };
    }).filter(Boolean);
  } catch (err) {
    return [];
  }
}

console.log('Collecting brand inventory via git grep...');

const inkflowMatches = runGitGrep('printflow');
const printHyphenFlowMatches = runGitGrep('print-flow');
const printerpMatches = runGitGrep('printflow');
const printErpSpacedMatches = runGitGrep('print flow');
const bnPrintErpSpaced = runGitGrep('প্রিন্টফ্লো');
const bnPrintErpJoined = runGitGrep('প্রিন্টফ্লো');
const bnInkflow = runGitGrep('প্রিন্টফ্লো');
const bnInkflow2 = runGitGrep('প্রিন্টফ্লো');

// Hostnames
const hostnameRegex = '([a-zA-Z0-9.-]+\\.)?(printflow|printflow)[a-zA-Z0-9.-]*\\.(com\\.bd|com|bd|io|app|net|vercel\\.app)';
const hostMatches = runGitGrep(hostnameRegex, true);

// Dedup and categorize
const allInventory = [];

function addItems(category, token, items) {
  for (const item of items) {
    allInventory.push({
      category,
      token,
      file: item.file,
      line: item.line,
      content: item.content
    });
  }
}

addItems('Token: printflow', 'printflow', inkflowMatches);
addItems('Token: print-flow', 'print-flow', printHyphenFlowMatches);
addItems('Token: printflow', 'printflow', printerpMatches);
addItems('Token: print flow', 'print flow', printErpSpacedMatches);
addItems('Bangla: প্রিন্টফ্লো', 'প্রিন্টফ্লো', bnPrintErpSpaced);
addItems('Bangla: প্রিন্টফ্লো', 'প্রিন্টফ্লো', bnPrintErpJoined);
addItems('Bangla: প্রিন্টফ্লো', 'প্রিন্টফ্লো', bnInkflow);
addItems('Bangla: প্রিন্টফ্লো', 'প্রিন্টফ্লো', bnInkflow2);
addItems('Hostname / Domain', 'hostname', hostMatches);

// Let's summarize by file and category
const byCategory = {};
const byFile = {};

for (const entry of allInventory) {
  byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  byFile[entry.file] = (byFile[entry.file] || 0) + 1;
}

// Generate Markdown
let md = `# PrintFlow Rebrand — Token & Domain Inventory

Generated as part of **Phase 0** to establish a comprehensive audit footprint for migrating from **PrintFlow / PrintFlow** to **PrintFlow** (\`প্রিন্টফ্লো\`).

---

## 1. Executive Summary & Match Counts

| Category / Pattern | Total Matches |
| :--- | :--- |
| **printflow** (case-insensitive) | ${inkflowMatches.length} |
| **print-flow** (case-insensitive) | ${printHyphenFlowMatches.length} |
| **printflow** (case-insensitive) | ${printerpMatches.length} |
| **print flow** (case-insensitive) | ${printErpSpacedMatches.length} |
| **Bangla: প্রিন্টফ্লো** | ${bnPrintErpSpaced.length} |
| **Bangla: প্রিন্টফ্লো** | ${bnPrintErpJoined.length} |
| **Bangla: প্রিন্টফ্লো / প্রিন্টফ্লো** | ${bnInkflow.length + bnInkflow2.length} |
| **Hostnames / Domains** (printflow/printflow + TLDs) | ${hostMatches.length} |
| **Unique Affected Files** | ${Object.keys(byFile).length} |
| **Total Inventory Footprint** | ${allInventory.length} |

---

## 2. Hostname & Domain Matches Detail

Hostnames matching \`(printflow|printflow)[a-z0-9.-]*\\.(com\\.bd|com|bd|io|app|net|vercel\\.app)\`:

| File | Line | Snippet |
| :--- | :--- | :--- |
`;

for (const h of hostMatches.slice(0, 150)) {
  const safeContent = h.content.replace(/\|/g, '\\|');
  md += `| \`${h.file}\` | ${h.line} | \`${safeContent}\` |\n`;
}
if (hostMatches.length > 150) {
  md += `\n*(Truncated ${hostMatches.length - 150} additional hostname matches; see scripts/inventory.json for full log)*\n`;
}

md += `\n---

## 3. Bangla Brand Terms Detail

Legacy Bangla transliterations identified:

| Term | Occurrences | Target Replacement |
| :--- | :--- | :--- |
| \`প্রিন্টফ্লো\` | ${bnPrintErpSpaced.length} | \`প্রিন্টফ্লো\` |
| \`প্রিন্টফ্লো\` | ${bnPrintErpJoined.length} | \`প্রিন্টফ্লো\` |
| \`প্রিন্টফ্লো\` / \`প্রিন্টফ্লো\` | ${bnInkflow.length + bnInkflow2.length} | \`প্রিন্টফ্লো\` |

### Bangla Matches:
| File | Line | Token | Snippet |
| :--- | :--- | :--- | :--- |
`;

const bnMatches = [...bnPrintErpSpaced, ...bnPrintErpJoined, ...bnInkflow, ...bnInkflow2];
for (const b of bnMatches) {
  const safeContent = b.content.replace(/\|/g, '\\|');
  md += `| \`${b.file}\` | ${b.line} | \`Bangla\` | \`${safeContent}\` |\n`;
}

md += `\n---

## 4. Top Impacted Files

| File | Total Matches |
| :--- | :--- |
`;

const sortedFiles = Object.entries(byFile).sort((a, b) => b[1] - a[1]);
for (const [file, count] of sortedFiles.slice(0, 30)) {
  md += `| \`${file}\` | ${count} |\n`;
}

md += `\n---

## 5. Architectural & System Boundaries

### Database & Migrations
- \`public._printerp_migrations\`: Live migration state tracking table. **Must NOT be renamed or dropped**.
- \`platform_system_settings\`: Contains \`app_name\`, \`app_title\`, \`app_tagline\`, \`app_domain\` (\`printflow.bd\`), \`support_helpline\`, \`contact_phone\`.
- \`email_gateways\`: Contains \`sender_name\` (\`PrintFlow\`), and untouched email fields.

### Runtime Keys & Cookies
- Cookies: \`printflow_platform_session\`, \`printflow_tenant_session\`, \`printflow_support_tenant\`.
- Storage / Event keys: \`printflow_locale\`, \`printflow_table_synced\`, \`printflow_data_sync\`, \`printflow_offline_drafts\`, \`printflow_registration_draft\`, etc.
- Must be unified via \`k(name) => \`\${BRAND.keyPrefix}_\${name}\`\` with a 1-release transition reader.

### Email Exclusions (Preserved Unaltered)
- \`platform_system_settings.contact_email\`
- \`email_gateways.sender_email\` / \`reply_to_email\`
- PDF fallback emails: \`accounts@printflow.bd\`, \`sales@printflow.bd\`, \`billing@printflow.bd\`, \`dispatch@printflow.bd\`
- \`.env.example\` mail values
- Mail OAuth settings
`;

fs.mkdirSync(path.join(process.cwd(), 'docs', 'rebrand'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs', 'rebrand', 'inventory.md'), md);
fs.writeFileSync(path.join(process.cwd(), 'scripts', 'inventory.json'), JSON.stringify({ summary: byCategory, fileCounts: byFile, hostMatches, bnMatches }, null, 2));

console.log('Wrote docs/rebrand/inventory.md and scripts/inventory.json successfully!');

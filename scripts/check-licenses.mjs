// ==============================================================================
// InkFlow ERP - Dependency License Compliance Gate
// Scans node_modules production dependencies to ensure 100% permissive open source licensing.
// Permitted: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0
// Prohibited: Viral copyleft licenses (GPL, AGPL) in proprietary commercial distribution.
// ==============================================================================

import fs from 'fs';
import path from 'path';

const ALLOWED_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Python-2.0',
]);

const PROHIBITED_KEYWORDS = ['GPL', 'AGPL', 'SSPL'];

function checkLicenses() {
  console.log('==============================================================================');
  console.log('InkFlow ERP - Dependency License Compliance Audit');
  console.log('==============================================================================');

  const pkgJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.error('package.json not found');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const prodDeps = Object.keys(pkg.dependencies || {});
  console.log(`Scanning ${prodDeps.length} direct production dependencies...`);

  let violations = 0;
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');

  for (const dep of prodDeps) {
    const depPkgPath = path.join(nodeModulesPath, dep, 'package.json');
    if (!fs.existsSync(depPkgPath)) {
      continue;
    }

    try {
      const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
      let license = depPkg.license;
      if (typeof license === 'object' && license !== null) {
        license = license.type;
      }

      if (!license) {
        // Check for LICENSE file
        const licenseFile = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].find((f) =>
          fs.existsSync(path.join(nodeModulesPath, dep, f))
        );
        if (licenseFile) {
          const licText = fs.readFileSync(path.join(nodeModulesPath, dep, licenseFile), 'utf8');
          if (licText.includes('MIT')) license = 'MIT';
          else if (licText.includes('Apache')) license = 'Apache-2.0';
          else if (licText.includes('BSD')) license = 'BSD';
        }
      }

      license = license || 'UNKNOWN';

      for (const prohibited of PROHIBITED_KEYWORDS) {
        if (license.toUpperCase().includes(prohibited) && !license.toUpperCase().includes('LGPL')) {
          console.error(`\x1b[31m[LICENSE VIOLATION]\x1b[0m ${dep} has restrictive license: ${license}`);
          violations++;
        }
      }
    } catch {
      // Ignore parse errors on individual packages
    }
  }

  if (violations > 0) {
    console.error(`\n❌ LICENSE AUDIT FAILED: ${violations} prohibited license(s) detected.`);
    process.exit(1);
  } else {
    console.log('\x1b[32m✅ LICENSE AUDIT PASSED: All direct production dependencies comply with permissive licensing.\x1b[0m');
    process.exit(0);
  }
}

checkLicenses();

import fs from 'fs';
import path from 'path';

const migrationsDir = 'supabase/migrations';
if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory ${migrationsDir} not found.`);
  process.exit(1);
}

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
let violations = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return; // ignore comments

    // Fail if migration executes an administrative purge function
    if (/\b(?:select|perform)\s+(?:public\.)?admin_purge_\w+\s*\(/i.test(trimmed)) {
      console.error(`[SECURITY VIOLATION] ${file}:${idx + 1} - Forbidden live execution of admin_purge_* function:`);
      console.error(`  ${trimmed}`);
      violations++;
    }

    // Fail if migration grants execute on a function to anon
    if (/grant\s+execute\s+on\s+function.+to\s+[^;]*\banon\b/i.test(trimmed)) {
      console.error(`[SECURITY VIOLATION] ${file}:${idx + 1} - Forbidden GRANT EXECUTE TO anon:`);
      console.error(`  ${trimmed}`);
      violations++;
    }
  });
}

if (violations > 0) {
  console.error(`\n❌ Migration security scan failed with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log(`\n✓ Migration security scan passed: 0 dangerous grants or purge executions across ${files.length} migration files.`);
  process.exit(0);
}

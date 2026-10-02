import { runUiAudit } from './crawler.ts'

async function main() {
  console.log('Initiating UI Consistency & Pixel Measurement Check (check.ts)...')
  try {
    const report = await runUiAudit()
    console.log(`\n========================================`)
    console.log(`UI AUDIT SUMMARY`)
    console.log(`Total Routes Scanned: ${report.summary.totalRoutesScanned}`)
    console.log(`Total Rendered Screenshots: ${report.summary.totalScreenshots}`)
    console.log(`Blocker Violations: ${report.summary.blockers}`)
    console.log(`Major Violations: ${report.summary.majors}`)
    console.log(`Minor Violations: ${report.summary.minors}`)
    console.log(`Total Violations: ${report.summary.totalViolations}`)
    console.log(`========================================\n`)

    if (report.summary.totalViolations > 0) {
      console.warn(`Audit completed with ${report.summary.totalViolations} violations. Review ui-audit-report.md`)
      process.exit(1)
    } else {
      console.log('✅ 100% CLEAN: 0 violations detected across all platform routes!')
      process.exit(0)
    }
  } catch (error) {
    console.error('Fatal error running UI audit:', error)
    process.exit(1)
  }
}

main()

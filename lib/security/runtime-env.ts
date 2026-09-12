/**
 * Runtime environment detection for InkFlow SaaS.
 * Distinguishes between test suites, browser, and server execution.
 */
export function isTestEnvironment(): boolean {
  if (typeof process === 'undefined') return false
  if (process.env.NODE_ENV === 'production') return false
  return (
    process.env.NODE_ENV === 'test' ||
    typeof process.env.NODE_TEST_CONTEXT !== 'undefined' ||
    Boolean(process.env.npm_lifecycle_event && process.env.npm_lifecycle_event.includes('test')) ||
    (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
    (Array.isArray(process.argv) && process.argv.some(arg => arg.includes('--test') || arg.includes('tests/')))
  )
}

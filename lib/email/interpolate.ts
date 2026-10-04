/**
 * Replaces `{{variable_name}}` placeholders with values from dictionary
 */
export function interpolateVariables(
  template: string,
  variables: Record<string, string | number | boolean | null | undefined> = {}
): string {
  if (!template) return ''
  let output = template

  for (const [key, val] of Object.entries(variables)) {
    if (val !== undefined && val !== null) {
      const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
      output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), stringVal)
    }
  }

  output = output.replace(/{{\\s*[\\w_.]+\\s*}}/g, '')
  return output
}

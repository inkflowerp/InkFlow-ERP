/**
 * Browser-safe CSV export utility
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  isExcelBOM: boolean = true
): void {
  if (typeof window === 'undefined') return

  const csvContent =
    (isExcelBOM ? '\uFEFF' : '') +
    headers.join(',') +
    '\n' +
    rows
      .map((r) =>
        r
          .map((cell) => {
            const val = cell === null || cell === undefined ? '' : String(cell)
            return `"${val.replace(/"/g, '""')}"`
          })
          .join(',')
      )
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

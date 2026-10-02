import type { ComputedElementStyles, AuditViolation } from './types.ts'

export const EXTRACT_COMPUTED_STYLES_FN = () => {
  const elements = Array.from(document.querySelectorAll('body *'))
  const results: ComputedElementStyles[] = []
  const inlineViolations: AuditViolation[] = []

  // Check document horizontal overflow
  const rootScrollWidth = document.documentElement.scrollWidth
  const rootClientWidth = window.innerWidth
  const hasHorizontalOverflow = rootScrollWidth > rootClientWidth + 1 // 1px tolerance

  for (const el of elements) {
    const htmlEl = el as HTMLElement
    // Ignore non-visible elements
    const rect = htmlEl.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue

    const style = window.getComputedStyle(htmlEl)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue

    const tag = htmlEl.tagName.toLowerCase()
    const classes = htmlEl.className && typeof htmlEl.className === 'string' ? htmlEl.className : ''
    const role = htmlEl.getAttribute('role') || undefined
    const textContent = htmlEl.textContent?.trim().slice(0, 40) || undefined

    const color = style.color
    const backgroundColor = style.backgroundColor
    const backgroundImage = style.backgroundImage
    const borderWidth = style.borderTopWidth
    const borderStyle = style.borderTopStyle
    const borderColor = style.borderTopColor
    const borderRadius = style.borderTopLeftRadius
    const boxShadow = style.boxShadow
    const outline = style.outline
    const fontFamily = style.fontFamily
    const fontSize = style.fontSize
    const fontWeight = style.fontWeight
    const lineHeight = style.lineHeight
    const letterSpacing = style.letterSpacing
    const textTransform = style.textTransform
    const padding = `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`
    const margin = `${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}`
    const gap = style.gap
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    const overflowX = style.overflowX
    const overflowY = style.overflowY
    const opacity = style.opacity
    const filter = style.filter
    const backdropFilter = style.backdropFilter
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'

    // 1. Check for decorative gradients (linear-gradient or radial-gradient)
    if (backgroundImage && backgroundImage !== 'none') {
      if (backgroundImage.includes('gradient')) {
        // Exclude cmyk rainbow line if on tenant pages
        if (!classes.includes('cmyk-rainbow-bar')) {
          inlineViolations.push({
            route: window.location.pathname,
            theme: currentTheme,
            viewport: window.innerWidth,
            selector: `${tag}.${classes.split(' ').slice(0, 3).join('.')}`,
            component: tag,
            property: 'backgroundImage',
            found: backgroundImage.slice(0, 60),
            expected: 'none (flat solid surface)',
            severity: 'major',
            message: 'Decorative gradient detected on rendered element.',
          })
        }
      }
    }

    // 2. Check for oversized shadows (shadow-xl / shadow-2xl / large blur shadows)
    if (boxShadow && boxShadow !== 'none') {
      const match = boxShadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
      if (match) {
        const blur = parseInt(match[3], 10)
        // Allow up to 16px blur for popovers/modals/dropdowns, but flag oversized glow or >24px blur shadows
        if (blur > 24 && !classes.includes('modal') && !classes.includes('popover') && !classes.includes('dialog')) {
          inlineViolations.push({
            route: window.location.pathname,
            theme: currentTheme,
            viewport: window.innerWidth,
            selector: `${tag}.${classes.split(' ').slice(0, 3).join('.')}`,
            component: tag,
            property: 'boxShadow',
            found: boxShadow.slice(0, 50),
            expected: 'shadow-xs or shadow-none (max blur 15px)',
            severity: 'major',
            message: 'Oversized shadow or decorative glow detected.',
          })
        }
      }
    }

    // 3. Check for border widths > 1px (excluding focus ring or outline)
    const bWidthPx = parseFloat(borderWidth)
    if (!isNaN(bWidthPx) && bWidthPx > 1.2 && borderStyle !== 'none') {
      if (!classes.includes('ring') && !classes.includes('focus') && tag !== 'svg') {
        inlineViolations.push({
          route: window.location.pathname,
          theme: currentTheme,
          viewport: window.innerWidth,
          selector: `${tag}.${classes.split(' ').slice(0, 3).join('.')}`,
          component: tag,
          property: 'borderWidth',
          found: borderWidth,
          expected: '1px solid border-border',
          severity: 'minor',
          message: `Border width of ${borderWidth} exceeds 1px standard spec.`,
        })
      }
    }

    // 4. Check font sizes under 11px
    const fontPx = parseFloat(fontSize)
    if (!isNaN(fontPx) && fontPx < 10.9 && textContent) {
      inlineViolations.push({
        route: window.location.pathname,
        theme: currentTheme,
        viewport: window.innerWidth,
        selector: `${tag}.${classes.split(' ').slice(0, 3).join('.')}`,
        component: tag,
        property: 'fontSize',
        found: fontSize,
        expected: '>= 11px (2xs scale)',
        severity: 'minor',
        message: 'Font size below minimum 11px accessibility threshold.',
      })
    }

    results.push({
      tag,
      classes,
      role,
      text: textContent,
      color,
      backgroundColor,
      backgroundImage,
      borderWidth,
      borderStyle,
      borderColor,
      borderRadius,
      boxShadow,
      outline,
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      textTransform,
      padding,
      margin,
      gap,
      width,
      height,
      overflowX,
      overflowY,
      opacity,
      filter,
      backdropFilter,
    })
  }

  return {
    elements: results,
    violations: inlineViolations,
    hasHorizontalOverflow,
    totalElements: results.length,
  }
}

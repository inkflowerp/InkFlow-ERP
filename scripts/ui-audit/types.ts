export interface AuditViolation {
  route: string
  theme: 'light' | 'dark'
  viewport: number
  selector: string
  component: string
  property: string
  found: string
  expected: string
  sourceFile?: string
  severity: 'blocker' | 'major' | 'minor'
  message: string
}

export interface ComputedElementStyles {
  tag: string
  classes: string
  role?: string
  text?: string
  color: string
  backgroundColor: string
  backgroundImage: string
  borderWidth: string
  borderStyle: string
  borderColor: string
  borderRadius: string
  boxShadow: string
  outline: string
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: string
  letterSpacing: string
  textTransform: string
  padding: string
  margin: string
  gap: string
  width: number
  height: number
  overflowX: string
  overflowY: string
  opacity: string
  filter: string
  backdropFilter: string
  contrastRatio?: number
  contrastPass?: boolean
}

export interface RouteAuditResult {
  route: string
  theme: 'light' | 'dark'
  viewport: number
  screenshotPath: string
  violations: AuditViolation[]
  totalElementsScanned: number
  hasHorizontalOverflow: boolean
  wcagPass: boolean
}

export interface CrossAppComponentComparison {
  componentType: string
  platformPage: string
  tenantPage: string
  property: string
  platformValue: string
  tenantValue: string
  isConsistent: boolean
}

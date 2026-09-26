// ==============================================================================
// PrintERP SaaS - Typed Server Action & Service Errors
//
// Replaces ad-hoc `catch (err: any)` blocks with a typed error hierarchy so
// server actions, services, and repositories surface failures with stable,
// machine-readable codes instead of free-form strings.
// ==============================================================================

/**
 * Stable error codes for action/service layer failures.
 *
 * Keep this list narrow and additive — clients (and tests) match against
 * these codes, so do not rename an existing entry. Add a new code if a
 * new failure mode appears.
 */
export type ActionErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'LIMIT_EXCEEDED'
  | 'RATE_LIMITED'
  | 'EXTERNAL_SERVICE'
  | 'DATABASE'
  | 'INTERNAL'

/**
 * Thrown by services and actions to signal a typed failure with an
 * HTTP-style status hint. Caught by `withActionLogging` and translated
 * into the standard `ServerActionResult` shape so client code keeps a
 * single error contract.
 */
export class ActionError extends Error {
  public readonly code: ActionErrorCode
  public readonly status: number
  public readonly details?: Record<string, unknown>
  public readonly cause?: unknown

  constructor(
    code: ActionErrorCode,
    message: string,
    options?: {
      cause?: unknown
      details?: Record<string, unknown>
      status?: number
    }
  ) {
    super(message)
    this.name = 'ActionError'
    this.code = code
    this.status = options?.status ?? ActionError.defaultStatus(code)
    this.details = options?.details
    this.cause = options?.cause
    // Maintain proper prototype chain across transpilation targets
    Object.setPrototypeOf(this, ActionError.prototype)
  }

  /**
   * Maps an error code to an HTTP status hint so middleware and logs can
   * surface the right severity without each call site deciding.
   */
  static defaultStatus(code: ActionErrorCode): number {
    switch (code) {
      case 'UNAUTHENTICATED':
        return 401
      case 'FORBIDDEN':
        return 403
      case 'NOT_FOUND':
        return 404
      case 'VALIDATION':
      case 'CONFLICT':
        return 409
      case 'LIMIT_EXCEEDED':
        return 409
      case 'RATE_LIMITED':
        return 429
      case 'EXTERNAL_SERVICE':
        return 502
      case 'DATABASE':
        return 503
      case 'INTERNAL':
      default:
        return 500
    }
  }

  /**
   * Convenience predicates so callers can write `if (ActionError.isUnauthorized(err))`.
   */
  static isUnauthorized(err: unknown): err is ActionError {
    return err instanceof ActionError && err.code === 'UNAUTHENTICATED'
  }

  static isForbidden(err: unknown): err is ActionError {
    return err instanceof ActionError && err.code === 'FORBIDDEN'
  }

  static isNotFound(err: unknown): err is ActionError {
    return err instanceof ActionError && err.code === 'NOT_FOUND'
  }

  static isValidation(err: unknown): err is ActionError {
    return err instanceof ActionError && err.code === 'VALIDATION'
  }
}
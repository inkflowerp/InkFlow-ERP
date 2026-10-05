// ==============================================================================
// PrintFlow - Authoritative Application Error Model (lib/errors/app-error.ts)
// Single Source of Truth for Typed Errors across Services, Server Actions, & UI
// ==============================================================================

import { ZodError } from 'zod'

export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'LIMIT_EXCEEDED'
  | 'INTERNAL'

export interface AppErrorData {
  code: AppErrorCode
  message: string
  messageBn: string
  fieldErrors?: Record<string, string[]>
  details?: Record<string, unknown>
  statusCode: number
}

const ERROR_STATUS_CODES: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  LIMIT_EXCEEDED: 429,
  INTERNAL: 500,
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly messageBn: string
  readonly fieldErrors?: Record<string, string[]>
  readonly details?: Record<string, unknown>
  readonly statusCode: number

  constructor(options: {
    code: AppErrorCode
    message: string
    messageBn?: string
    fieldErrors?: Record<string, string[]>
    details?: Record<string, unknown>
  }) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.messageBn = options.messageBn || getDefaultBengaliMessage(options.code)
    this.fieldErrors = options.fieldErrors
    this.details = options.details
    this.statusCode = ERROR_STATUS_CODES[options.code] || 500

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  toData(): AppErrorData {
    return {
      code: this.code,
      message: this.message,
      messageBn: this.messageBn,
      fieldErrors: this.fieldErrors,
      details: this.details,
      statusCode: this.statusCode,
    }
  }

  // Factory methods for consistent creation
  static unauthenticated(message = 'Authentication required', messageBn = 'লগইন প্রয়োজন'): AppError {
    return new AppError({ code: 'UNAUTHENTICATED', message, messageBn })
  }

  static forbidden(message = 'Access denied: insufficient permissions', messageBn = 'অনুমতি নেই'): AppError {
    return new AppError({ code: 'FORBIDDEN', message, messageBn })
  }

  static notFound(resource = 'Resource', messageBn?: string): AppError {
    return new AppError({
      code: 'NOT_FOUND',
      message: `${resource} not found`,
      messageBn: messageBn || `${resource} খুঁজে পাওয়া যায়নি`,
    })
  }

  static validation(fieldErrors: Record<string, string[]>, message = 'Invalid input parameters', messageBn = 'তথ্য সঠিক নয়'): AppError {
    return new AppError({ code: 'VALIDATION', message, messageBn, fieldErrors })
  }

  static conflict(message = 'A conflicting record already exists', messageBn = 'একই রেকর্ড ইতিমধ্যে বিদ্যমান'): AppError {
    return new AppError({ code: 'CONFLICT', message, messageBn })
  }

  static limitExceeded(message = 'Plan quota or rate limit exceeded', messageBn = 'প্ল্যানের সীমা অতিক্রম করেছে'): AppError {
    return new AppError({ code: 'LIMIT_EXCEEDED', message, messageBn })
  }

  static internal(message = 'An unexpected internal error occurred', messageBn = 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে'): AppError {
    return new AppError({ code: 'INTERNAL', message, messageBn })
  }
}

function getDefaultBengaliMessage(code: AppErrorCode): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'অধিবেশনের মেয়াদ শেষ হয়েছে, পুনরায় লগইন করুন'
    case 'FORBIDDEN':
      return 'এই কার্যক্রমটি সম্পন্ন করার অনুমতি আপনার নেই'
    case 'NOT_FOUND':
      return 'অনুরোধকৃত তথ্য খুঁজে পাওয়া যায়নি'
    case 'VALIDATION':
      return 'প্রদত্ত তথ্য যাচাইকরণে ত্রুটি দেখা দিয়েছে'
    case 'CONFLICT':
      return 'অনুরোধকৃত তথ্য ইতিমধ্যে সিস্টেমে বিদ্যমান'
    case 'LIMIT_EXCEEDED':
      return 'আপনার বর্তমান সাবস্ক্রিপশন প্ল্যানের সীমা অতিক্রান্ত হয়েছে'
    case 'INTERNAL':
    default:
      return 'সাময়িক কারিগরি ত্রুটি হয়েছে, অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন'
  }
}

/**
 * Sanitizes any raw runtime / database / network error into a safe, user-friendly AppErrorData.
 * Never leaks raw SQL expressions, table names, or postgres error codes to the client.
 */
export function sanitizeError(err: unknown, locale: 'en' | 'bn' = 'en'): AppErrorData {
  if (err instanceof AppError) {
    return err.toData()
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'general'
      if (!fieldErrors[path]) fieldErrors[path] = []
      fieldErrors[path].push(issue.message)
    }
    return {
      code: 'VALIDATION',
      message: 'Validation failed on input data',
      messageBn: 'প্রদত্ত তথ্যের সঠিকতা নিশ্চিত করুন',
      fieldErrors,
      statusCode: 422,
    }
  }

  const rawMsg = err instanceof Error ? err.message : String(err || '')

  // 1. Unique constraint violation (23505)
  if (rawMsg.includes('23505') || rawMsg.includes('duplicate key') || rawMsg.includes('already exists')) {
    if (rawMsg.includes('idempotency') || rawMsg.includes('idemp')) {
      return {
        code: 'CONFLICT',
        message: 'This transaction was already submitted. Duplicate processing prevented.',
        messageBn: 'এই লেনদেনটি ইতিমধ্যে জমা দেওয়া হয়েছে। অনুলিপি রোধ করা হয়েছে।',
        statusCode: 409,
      }
    }
    return {
      code: 'CONFLICT',
      message: 'A record with this identifier or number already exists.',
      messageBn: 'এই নম্বর বা তথ্যের একটি রেকর্ড ইতিমধ্যে বিদ্যমান আছে।',
      statusCode: 409,
    }
  }

  // 2. Foreign key violation (23503)
  if (rawMsg.includes('23503') || rawMsg.includes('violates foreign key')) {
    return {
      code: 'NOT_FOUND',
      message: 'A referenced entity (customer, branch, or product) was not found.',
      messageBn: 'সংযুক্ত গ্রাহক, শাখা বা পণ্য খুঁজে পাওয়া যায়নি।',
      statusCode: 404,
    }
  }

  // 3. Check constraint violation (23514)
  if (rawMsg.includes('23514') || rawMsg.includes('violates check constraint')) {
    if (rawMsg.includes('chk_invoice_paid_plus_due')) {
      return {
        code: 'VALIDATION',
        message: 'Financial integrity error: Paid amount + due amount must equal grand total.',
        messageBn: 'হিসাব অমিল: পরিশোধিত এবং বকেয়া টাকার যোগফল মোট টাকার সমান হতে হবে।',
        statusCode: 422,
      }
    }
    if (rawMsg.includes('chk_invoice_paid_le_grand')) {
      return {
        code: 'VALIDATION',
        message: 'Paid amount cannot exceed grand total.',
        messageBn: 'পরিশোধিত টাকা মোট বিলের চেয়ে বেশি হতে পারবে না।',
        statusCode: 422,
      }
    }
    return {
      code: 'VALIDATION',
      message: 'Calculation integrity constraint violated. Please review transaction values.',
      messageBn: 'হিসাবের সঠিকতার নিয়ম লঙ্ঘিত হয়েছে। টাকার অংক যাচাই করুন।',
      statusCode: 422,
    }
  }

  // 4. Row Level Security / Auth
  if (rawMsg.includes('row-level security') || rawMsg.includes('permission denied') || rawMsg.includes('Unauthorized')) {
    return {
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action.',
      messageBn: 'আপনার এই কাজটি করার অনুমতি নেই।',
      statusCode: 403,
    }
  }

  // 5. Quota / Plan Exceeded
  if (rawMsg.includes('quota') || rawMsg.includes('Plan limit') || rawMsg.includes('limit reached')) {
    return {
      code: 'LIMIT_EXCEEDED',
      message: rawMsg,
      messageBn: 'আপনার সাবস্ক্রিপশন প্ল্যানের সর্বোচ্চ সীমা শেষ হয়েছে।',
      statusCode: 429,
    }
  }

  // Fallback to internal error without leaking stack or raw SQL
  return {
    code: 'INTERNAL',
    message: 'An unexpected internal error occurred. Please try again.',
    messageBn: 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
    statusCode: 500,
  }
}

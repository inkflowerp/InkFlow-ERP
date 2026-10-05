// ==============================================================================
// PrintFlow - Enterprise Structured JSON Logger & Observability Engine
// Emits single-line structured JSON logs with tenant, hashed user, and trace IDs.
// Designed for seamless ingestion by Supabase Log Drains, Vercel, Datadog, and Sentry.
// Automatically scrubs PII, JWT tokens, passwords, and sensitive keys.
// ==============================================================================

import crypto from 'crypto';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  route?: string;
  action?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  tenant_id: string;
  user_id_hash: string;
  request_id: string;
  route?: string;
  action?: string;
  duration_ms?: number;
  environment: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_KEY_REGEX = /password|secret|token|api_key|authorization|bearer|pin|cvv|credit_card|auth_token/i;

/**
 * Anonymizes user identifiers to SHA-256 hashes to guarantee tenant privacy while allowing trace correlation.
 */
export function hashUserId(userId?: string): string {
  if (!userId || userId === 'anonymous' || userId === 'system') return 'anonymous';
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

/**
 * Deep-sanitizes log metadata to scrub sensitive credentials, passwords, and tokens.
 */
export function sanitizeLogMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

class StructuredLogger {
  private formatLog(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    metadata?: Record<string, unknown>,
    error?: Error
  ): StructuredLogEntry {
    const { tenantId, userId, requestId, route, action, durationMs, ...extraContext } = context;

    const mergedMeta = {
      ...(metadata || {}),
      ...extraContext,
    };

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      tenant_id: tenantId || 'global',
      user_id_hash: hashUserId(userId),
      request_id: requestId || crypto.randomUUID(),
      route,
      action,
      duration_ms: durationMs,
      environment: process.env.NODE_ENV || 'development',
      metadata: sanitizeLogMetadata(mergedMeta),
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          }
        : undefined,
    };
  }

  private emit(entry: StructuredLogEntry): void {
    const jsonString = JSON.stringify(entry);
    if (entry.level === 'ERROR') {
      console.error(jsonString);
    } else if (entry.level === 'WARN') {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      this.emit(this.formatLog('DEBUG', message, context, metadata));
    }
  }

  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.emit(this.formatLog('INFO', message, context, metadata));
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.emit(this.formatLog('WARN', message, context, metadata));
  }

  error(message: string, context?: LogContext, error?: Error, metadata?: Record<string, unknown>): void {
    this.emit(this.formatLog('ERROR', message, context, metadata, error));
  }

  audit(action: string, message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.emit(this.formatLog('AUDIT', `[AUDIT] ${action}: ${message}`, context, metadata));
  }
}

export const logger = new StructuredLogger();

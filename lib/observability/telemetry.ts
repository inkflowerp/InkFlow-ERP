// ==============================================================================
// PrintFlow - Observability & Error Telemetry Engine
// Integrates with Sentry / Vercel Observability and exports captureError helpers.
// Tags every event with tenant_id, hashed user_id, and request_id.
// ==============================================================================

import { logger, hashUserId, type LogContext } from './structured-logger';

export interface TelemetryTags {
  tenant_id?: string;
  user_id_hash?: string;
  request_id?: string;
  route?: string;
  action?: string;
  role?: string;
  version?: string;
}

export function captureException(
  error: unknown,
  context: LogContext & { tags?: TelemetryTags; extra?: Record<string, unknown> } = {}
): void {
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  const tags: TelemetryTags = {
    tenant_id: context.tenantId || 'global',
    user_id_hash: hashUserId(context.userId),
    request_id: context.requestId,
    route: context.route,
    action: context.action,
    role: (context.extra?.role as string) || undefined,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    ...(context.tags || {}),
  };

  // Structured JSON Log for Supabase Log Drains & CloudWatch / Datadog
  logger.error(normalizedError.message, context, normalizedError, {
    tags,
    extra: context.extra,
  });

  // If Sentry is initialized at runtime
  if (typeof (globalThis as any).Sentry !== 'undefined') {
    try {
      const Sentry = (globalThis as any).Sentry;
      Sentry.withScope((scope: any) => {
        if (tags.tenant_id) scope.setTag('tenant_id', tags.tenant_id);
        if (tags.user_id_hash) scope.setTag('user_id_hash', tags.user_id_hash);
        if (tags.request_id) scope.setTag('request_id', tags.request_id);
        if (tags.route) scope.setTag('route', tags.route);
        if (context.extra) scope.setExtras(context.extra);
        Sentry.captureException(normalizedError);
      });
    } catch {
      // Fallback already logged via logger.error
    }
  }
}

export function recordMetric(
  metricName: string,
  value: number,
  unit: 'ms' | 'bytes' | 'count' = 'count',
  tags?: Record<string, string>
): void {
  logger.info(`Metric: ${metricName}=${value}${unit}`, {
    action: 'telemetry_metric',
    metric_name: metricName,
    metric_value: value,
    metric_unit: unit,
    ...(tags || {}),
  });
}

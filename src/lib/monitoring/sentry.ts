/**
 * HOUSEYE.COM — Sentry helper (optional)
 * Set NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN to enable.
 */

export function captureException(err: unknown, context?: Record<string, unknown>) {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.error('[Houseye]', err, context);
    return;
  }

  // Lightweight: log structured; full @sentry/nextjs can replace this
  console.error(
    JSON.stringify({
      level: 'error',
      sentryDsnConfigured: true,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context,
      ts: new Date().toISOString(),
    })
  );
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(JSON.stringify({ level, message, ts: new Date().toISOString() }));
}

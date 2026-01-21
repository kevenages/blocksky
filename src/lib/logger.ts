/**
 * Structured logger for Cloud Logging
 * Outputs JSON that Cloud Run automatically picks up and parses
 */

type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

interface LogContext {
  userId?: string
  userHandle?: string
  action?: string
  targetDid?: string
  targetHandle?: string
  count?: number
  duration?: number
  [key: string]: unknown
}

interface LogEntry {
  severity: LogSeverity
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    name?: string
  }
  // Cloud Logging specific fields
  'logging.googleapis.com/trace'?: string
  'logging.googleapis.com/spanId'?: string
  // Error Reporting type field
  '@type'?: string
}

function formatLog(severity: LogSeverity, message: string, context?: LogContext, error?: Error): string {
  const entry: LogEntry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context
  }

  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
    // Error Reporting looks for this format
    if (severity === 'ERROR' || severity === 'CRITICAL') {
      // Include @type for Error Reporting to pick it up
      entry['@type'] = 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent'
    }
  }

  return JSON.stringify(entry)
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('DEBUG', message, context))
    }
  },

  info(message: string, context?: LogContext) {
    console.log(formatLog('INFO', message, context))
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog('WARNING', message, context))
  },

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined
    console.error(formatLog('ERROR', message, context, err))
  },

  critical(message: string, error?: Error | unknown, context?: LogContext) {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined
    console.error(formatLog('CRITICAL', message, context, err))
  },

  // Helper for timing operations
  time(_label: string): () => number {
    const start = Date.now()
    return () => Date.now() - start
  },
}

export type { LogContext, LogSeverity }

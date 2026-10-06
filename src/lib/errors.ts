/**
 * User-safe error mapper for Postgres, PostgREST, and Supabase Auth errors.
 * Never leaks raw DB internals, stack traces, or PII.
 */

export interface AppError {
  code?: string;
  message: string;
  isAuthError?: boolean;
}

export function mapDatabaseError(error: unknown): AppError {
  if (!error) {
    return { message: 'An unexpected error occurred. Please try again.' };
  }

  // Handle PostgREST / Supabase error shapes
  const errObj = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
  };

  const code = errObj.code || (errObj.status ? String(errObj.status) : undefined);
  const rawMsg = errObj.message || '';

  // 42501: RLS or permission denied
  if (code === '42501' || rawMsg.includes('permission denied') || rawMsg.includes('Forbidden')) {
    return {
      code: '42501',
      message: 'You do not have permission to perform this action.',
    };
  }

  // 23P01: Postgres exclusion constraint violation (booking time clash)
  if (code === '23P01' || rawMsg.includes('exclusion constraint') || rawMsg.includes('overlapping')) {
    return {
      code: '23P01',
      message: 'This time slot overlaps with another booking on the same resource.',
    };
  }

  // 23505: Unique constraint violation
  if (code === '23505' || rawMsg.includes('duplicate key')) {
    return {
      code: '23505',
      message: 'A record with this identifier or unique value already exists.',
    };
  }

  // 23514: Check constraint violation
  if (code === '23514' || rawMsg.includes('check constraint')) {
    return {
      code: '23514',
      message: 'One or more values are outside the permitted business range or constraints.',
    };
  }

  // 23503: Foreign key constraint violation (restrict on delete)
  if (code === '23503' || rawMsg.includes('foreign key constraint')) {
    return {
      code: '23503',
      message: 'This record cannot be modified or deactivated because related records still reference it.',
    };
  }

  // PGRST116: Expected a single row but got none (Not Found)
  if (code === 'PGRST116' || rawMsg.includes('JSON object requested, multiple (or no) rows returned')) {
    return {
      code: 'PGRST116',
      message: 'The requested record was not found or you do not have permission to access it.',
    };
  }

  // JWT expired / session invalid
  if (
    rawMsg.includes('JWT') ||
    rawMsg.includes('token is expired') ||
    rawMsg.includes('invalid claim') ||
    code === 'PGRST301' ||
    code === 'invalid_jwt'
  ) {
    return {
      code: 'AUTH_EXPIRED',
      message: 'Your admin session has expired. Please sign in again.',
      isAuthError: true,
    };
  }

  // Network / fetch failures
  if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('fetch failed')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failure. Please check your internet connection.',
    };
  }

  // Concurrency check error
  if (rawMsg.includes('Concurrency conflict') || rawMsg.includes('record changed')) {
    return {
      code: 'CONCURRENCY_CONFLICT',
      message: 'This record changed while you were editing. Reload to see the latest version.',
    };
  }

  // Generic fallback without leaking DB internals
  return {
    code: code || 'UNKNOWN_ERROR',
    message: 'The operation could not be completed. Please refresh and try again.',
  };
}

/**
 * HOUSEYE.COM — Consistent API Response Helpers
 */

import { NextResponse } from 'next/server';
import { ApiErrorResponse, ApiSuccessResponse } from '@/types';

export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

/** Common error helpers */
export const Errors = {
  unauthorized: (msg = 'Authentication required') =>
    errorResponse('UNAUTHORIZED', msg, 401),

  forbidden: (msg = "You don't have permission to perform this action") =>
    errorResponse('FORBIDDEN', msg, 403),

  notFound: (msg = 'Resource not found') =>
    errorResponse('NOT_FOUND', msg, 404),

  validation: (msg: string, details?: unknown) =>
    errorResponse('VALIDATION_ERROR', msg, 422, details),

  subscriptionInactive: (
    msg = 'Your subscription is inactive. Activate your plan to perform this action.'
  ) => errorResponse('SUBSCRIPTION_INACTIVE', msg, 403),

  resourceLimit: (msg: string) =>
    errorResponse('RESOURCE_LIMIT', msg, 403),

  conflict: (msg: string) => errorResponse('CONFLICT', msg, 409),

  locked: (msg: string) => errorResponse('ACCOUNT_LOCKED', msg, 423),

  server: (msg = 'Something went wrong. Please try again.') =>
    errorResponse('SERVER_ERROR', msg, 500),
};

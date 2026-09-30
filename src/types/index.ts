/**
 * HOUSEYE.COM — Core Type Definitions
 * Phase 1 Foundation
 */

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'MANAGER' | 'TENANT';

export type AccountType = 'INDIVIDUAL' | 'ORGANIZATION';

export type UserStatus =
  | 'PENDING_INVITATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REMOVED'
  | 'DEACTIVATED';

export type SubscriptionStatus =
  | 'EXPLORE'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING_PAYMENT'
  | 'DELETION_PENDING';

export type PlanId = 'ESSENTIAL' | 'PROFESSIONAL' | 'BUSINESS';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthSession {
  userId: string;
  accountId: string;
  role: Role;
  username: string;
  email?: string;
  sessionId: string;
  isSuperAdmin: boolean;
}

export interface PlanLimits {
  properties: number;
  units: number;
  primaryTenants: number;
  admins: number;
  managers: number;
  storageGB: number;
  externalNotifications: number;
}

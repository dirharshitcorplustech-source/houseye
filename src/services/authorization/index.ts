/**
 * HOUSEYE.COM — Central Authorization Service
 * Every protected action must go through this layer.
 *
 * Evaluation order:
 * Auth → Account → Role → Permission → Scope → Subscription → Entitlement
 */

import { CurrentUser } from '@/lib/auth/get-session';
import { Role } from '@/types';
import { ROLE_LEVEL } from '@/constants/roles';

export type AuthzResult =
  | { allowed: true }
  | { allowed: false; code: string; message: string };

/**
 * Check if actor can view a target role (hierarchy)
 */
export function canViewRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}

/**
 * Owner has full authority within their account
 */
export function isOwner(user: CurrentUser): boolean {
  return user.role === 'OWNER';
}

/**
 * Super Admin platform authority
 */
export function isSuperAdmin(user: CurrentUser): boolean {
  return user.isSuperAdmin || user.role === 'SUPER_ADMIN';
}

/**
 * Check account isolation — resource must belong to same account
 */
export function sameAccount(
  user: CurrentUser,
  resourceAccountId: string | null | undefined
): AuthzResult {
  if (isSuperAdmin(user)) {
    return { allowed: true };
  }
  if (!user.accountId || !resourceAccountId) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to perform this action",
    };
  }
  if (user.accountId !== resourceAccountId) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to perform this action",
    };
  }
  return { allowed: true };
}

/**
 * Check subscription allows operational mutations
 */
export function requireActiveSubscription(user: CurrentUser): AuthzResult {
  if (isSuperAdmin(user)) {
    return { allowed: true };
  }

  const status = user.subscriptionStatus;

  if (status === 'ACTIVE') {
    return { allowed: true };
  }

  if (status === 'EXPLORE') {
    return {
      allowed: false,
      code: 'SUBSCRIPTION_REQUIRED',
      message:
        'This action requires an active subscription. Choose a plan to continue.',
    };
  }

  return {
    allowed: false,
    code: 'SUBSCRIPTION_INACTIVE',
    message:
      'Your subscription is inactive. Activate your plan to perform this action.',
  };
}

/**
 * Check if user has a specific permission key
 * Owner is treated as having all permissions within account
 */
export function hasPermission(
  user: CurrentUser,
  permission: string
): boolean {
  if (isSuperAdmin(user) || isOwner(user)) return true;
  return (user.permissions || []).includes(permission);
}

/**
 * Manager/Admin scope check — property must be in assigned scopes
 * Empty scopes for Admin with "full access" can be handled by caller
 */
export function hasPropertyScope(
  user: CurrentUser,
  propertyId: string,
  allowEmptyAsFull = false
): AuthzResult {
  if (isSuperAdmin(user) || isOwner(user)) {
    return { allowed: true };
  }

  const scopes = user.propertyScopes || [];

  if (scopes.length === 0) {
    if (allowEmptyAsFull && user.role === 'ADMIN') {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: "You don't have access to this property",
    };
  }

  if (!scopes.includes(propertyId)) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: "You don't have access to this property",
    };
  }

  return { allowed: true };
}

/**
 * Composite check used by most write operations
 */
export function authorizeWrite(params: {
  user: CurrentUser;
  resourceAccountId: string;
  propertyId?: string;
  permission?: string;
  requireSubscription?: boolean;
}): AuthzResult {
  const {
    user,
    resourceAccountId,
    propertyId,
    permission,
    requireSubscription = true,
  } = params;

  const accountCheck = sameAccount(user, resourceAccountId);
  if (!accountCheck.allowed) return accountCheck;

  if (requireSubscription) {
    const subCheck = requireActiveSubscription(user);
    if (!subCheck.allowed) return subCheck;
  }

  if (permission && !hasPermission(user, permission)) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: "You don't have permission to perform this action",
    };
  }

  if (propertyId) {
    const scopeCheck = hasPropertyScope(user, propertyId);
    if (!scopeCheck.allowed) return scopeCheck;
  }

  return { allowed: true };
}

/**
 * HOUSEYE.COM — Roles & Hierarchy
 */

import { Role } from '@/types';

export const ROLES: Role[] = [
  'SUPER_ADMIN',
  'OWNER',
  'ADMIN',
  'MANAGER',
  'TENANT',
];

/** Higher number = higher privilege */
export const ROLE_LEVEL: Record<Role, number> = {
  SUPER_ADMIN: 100,
  OWNER: 80,
  ADMIN: 60,
  MANAGER: 40,
  TENANT: 20,
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  TENANT: 'Tenant',
};

/** Username prefix by role */
export const USERNAME_PREFIX: Record<Role, string> = {
  SUPER_ADMIN: 'SA',
  OWNER: 'OWN',
  ADMIN: 'ADM',
  MANAGER: 'MGR',
  TENANT: 'TEN',
};

/**
 * HOUSEYE.COM — System-generated Username
 * Pattern: PREFIX-NAME-RANDOM
 * Example: OWN-RAHUL-7K4M92
 */

import { customAlphabet } from 'nanoid';
import { Role } from '@/types';
import { USERNAME_PREFIX } from '@/constants/roles';

const generateSuffix = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  6
);

function sanitizeName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 12) || 'USER';
}

export function generateUsername(role: Role, fullName: string): string {
  const prefix = USERNAME_PREFIX[role];
  const namePart = sanitizeName(fullName.split(' ')[0] || fullName);
  const suffix = generateSuffix();
  return `${prefix}-${namePart}-${suffix}`;
}

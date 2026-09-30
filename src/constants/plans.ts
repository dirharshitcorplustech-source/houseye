/**
 * HOUSEYE.COM — Subscription Plans (Locked Pricing & Limits)
 */

import { PlanId, PlanLimits } from '@/types';

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  ESSENTIAL: {
    properties: 1,
    units: 10,
    primaryTenants: 10,
    admins: 0,
    managers: 1,
    storageGB: 2,
    externalNotifications: 100,
  },
  PROFESSIONAL: {
    properties: 3,
    units: 30,
    primaryTenants: 30,
    admins: 1,
    managers: 3,
    storageGB: 5,
    externalNotifications: 500,
  },
  BUSINESS: {
    properties: 10,
    units: 100,
    primaryTenants: 100,
    admins: 3,
    managers: 10,
    storageGB: 20,
    externalNotifications: 2000,
  },
};

export const PLAN_PRICING = {
  ESSENTIAL: {
    monthly: 499,
    annual: 4990, // ~2 months free
  },
  PROFESSIONAL: {
    monthly: 1499,
    annual: 14990,
  },
  BUSINESS: {
    monthly: 3999,
    annual: 39990,
  },
} as const;

export const ADDON_PRICING = {
  extraUnit: 99, // per unit / month
  extraAdmin: 299, // per admin / month
  extraManager: 199, // per manager / month
  extraStorage5GB: 99, // per 5 GB / month
  extraNotifications100: 99, // per 100 / month
} as const;

export const PLAN_NAMES: Record<PlanId, string> = {
  ESSENTIAL: 'Essential',
  PROFESSIONAL: 'Professional',
  BUSINESS: 'Business',
};

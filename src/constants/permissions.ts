/**
 * HOUSEYE.COM — Permission Keys
 * Owner has implicit full access.
 * Admin/Manager receive explicit grants.
 */

export const PERMISSIONS = {
  // Property structure — Owner only for create/edit/delete structure
  PROPERTY_VIEW: 'property:view',
  PROPERTY_CREATE: 'property:create', // Owner only in MVP
  PROPERTY_EDIT: 'property:edit', // Owner only for structure
  PROPERTY_DELETE: 'property:delete', // Owner only → Trash

  // Units operational
  UNIT_VIEW: 'unit:view',
  UNIT_EDIT_DETAILS: 'unit:edit_details', // non-structure fields

  // Tenants
  TENANT_VIEW: 'tenant:view',
  TENANT_CREATE: 'tenant:create',
  TENANT_EDIT: 'tenant:edit',
  TENANT_MOVE_OUT: 'tenant:move_out',

  // Billing / payments
  BILL_VIEW: 'bill:view',
  BILL_GENERATE: 'bill:generate',
  BILL_EDIT: 'bill:edit',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_APPROVE: 'payment:approve',
  PAYMENT_REJECT: 'payment:reject',
  PAYMENT_ALLOCATION_OVERRIDE: 'payment:allocation_override', // Owner only

  // Maintenance
  MAINTENANCE_VIEW: 'maintenance:view',
  MAINTENANCE_UPDATE: 'maintenance:update',
  MAINTENANCE_COST_DECIDE: 'maintenance:cost_decide',

  // Expenses
  EXPENSE_VIEW: 'expense:view',
  EXPENSE_CREATE: 'expense:create',
  EXPENSE_EDIT: 'expense:edit',

  // Meter
  METER_VIEW: 'meter:view',
  METER_SUBMIT: 'meter:submit',
  METER_CORRECT: 'meter:correct',

  // Team
  TEAM_VIEW: 'team:view',
  TEAM_INVITE_MANAGER: 'team:invite_manager',
  TEAM_INVITE_ADMIN: 'team:invite_admin', // Owner only typically
  TEAM_EDIT: 'team:edit',
  TEAM_SUSPEND: 'team:suspend',

  // Reports / documents
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  DOCUMENT_VIEW: 'document:view',
  DOCUMENT_UPLOAD: 'document:upload',
  NOTICE_CREATE: 'notice:create',
  NOTICE_VIEW: 'notice:view',

  // Notifications preferences managed by self; sending is system
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Default permissions suggested when inviting a Manager */
export const DEFAULT_MANAGER_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.PROPERTY_VIEW,
  PERMISSIONS.UNIT_VIEW,
  PERMISSIONS.TENANT_VIEW,
  PERMISSIONS.TENANT_CREATE,
  PERMISSIONS.TENANT_EDIT,
  PERMISSIONS.BILL_VIEW,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.MAINTENANCE_VIEW,
  PERMISSIONS.MAINTENANCE_UPDATE,
  PERMISSIONS.EXPENSE_VIEW,
  PERMISSIONS.METER_VIEW,
  PERMISSIONS.METER_SUBMIT,
  PERMISSIONS.REPORT_VIEW,
];

/** Default permissions suggested when inviting an Admin (custom access) */
export const DEFAULT_ADMIN_PERMISSIONS: PermissionKey[] = [
  ...DEFAULT_MANAGER_PERMISSIONS,
  PERMISSIONS.TENANT_MOVE_OUT,
  PERMISSIONS.BILL_GENERATE,
  PERMISSIONS.PAYMENT_APPROVE,
  PERMISSIONS.PAYMENT_REJECT,
  PERMISSIONS.MAINTENANCE_COST_DECIDE,
  PERMISSIONS.EXPENSE_CREATE,
  PERMISSIONS.EXPENSE_EDIT,
  PERMISSIONS.METER_CORRECT,
  PERMISSIONS.TEAM_VIEW,
  PERMISSIONS.TEAM_INVITE_MANAGER,
  PERMISSIONS.REPORT_EXPORT,
  PERMISSIONS.DOCUMENT_VIEW,
  PERMISSIONS.DOCUMENT_UPLOAD,
  PERMISSIONS.NOTICE_CREATE,
  PERMISSIONS.NOTICE_VIEW,
];

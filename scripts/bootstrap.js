/**
 * HOUSEYE.COM — CLI bootstrap for Super Admin
 * Usage: node scripts/bootstrap.js
 * Requires .env.local with MONGODB_URI, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
 */

require('dotenv').config({ path: '.env.local' });

async function main() {
  // Dynamic import so this works after npm install
  const { bootstrapSuperAdmin } = await import(
    '../src/services/auth/bootstrap-super-admin.ts'
  ).catch(() => {
    console.error(
      'Run this after TypeScript build or use the API: POST /api/admin/bootstrap'
    );
    process.exit(1);
  });

  const result = await bootstrapSuperAdmin();
  console.log(result);
  process.exit(result.created ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

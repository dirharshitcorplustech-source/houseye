/**
 * HOUSEYE.COM — Dev seed script
 * Creates Super Admin + sample Owner (ACTIVE Professional plan)
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-dev.mjs
 *   OR: MONGODB_URI=... node scripts/seed-dev.mjs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/houseye';

async function main() {
  console.log('Connecting to', MONGODB_URI.replace(/\/\/.*@/, '//***@'));
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const users = db.collection('users');
  const accounts = db.collection('accounts');

  // Super Admin
  const saUsername = 'SA-HOUSEYE-ADMIN';
  const existingSa = await users.findOne({ username: saUsername });
  if (!existingSa) {
    const passwordHash = await bcrypt.hash('Houseye@Admin1', 12);
    await users.insertOne({
      role: 'SUPER_ADMIN',
      username: saUsername,
      email: 'admin@houseye.com',
      passwordHash,
      fullName: 'Houseye Super Admin',
      status: 'ACTIVE',
      isEmailVerified: true,
      isMobileVerified: false,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      permissions: [],
      propertyScopes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✓ Super Admin:', saUsername, '/ Houseye@Admin1');
  } else {
    console.log('· Super Admin already exists');
  }

  // Owner + Account
  const ownerUsername = 'OWN-DEMO-OWNER';
  const existingOwner = await users.findOne({ username: ownerUsername });
  if (!existingOwner) {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const accountResult = await accounts.insertOne({
      accountType: 'INDIVIDUAL',
      name: 'Demo Owner',
      subscriptionStatus: 'ACTIVE',
      planId: 'PROFESSIONAL',
      subscriptionStartAt: new Date(),
      subscriptionEndAt: end,
      autoRenew: true,
      usage: {
        properties: 0,
        units: 0,
        primaryTenants: 0,
        admins: 0,
        managers: 0,
        storageBytes: 0,
        externalNotificationsUsed: 0,
      },
      addOns: {
        extraUnits: 0,
        extraAdmins: 0,
        extraManagers: 0,
        extraStorageGB: 0,
        extraNotifications: 0,
      },
      isSuspended: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const passwordHash = await bcrypt.hash('Demo@Owner1', 12);
    await users.insertOne({
      accountId: accountResult.insertedId,
      role: 'OWNER',
      username: ownerUsername,
      email: 'owner@demo.houseye.com',
      passwordHash,
      fullName: 'Demo Owner',
      status: 'ACTIVE',
      isEmailVerified: true,
      isMobileVerified: false,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      permissions: [],
      propertyScopes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✓ Owner:', ownerUsername, '/ Demo@Owner1 (Professional ACTIVE)');
  } else {
    console.log('· Demo Owner already exists');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * HOUSEYE.COM — Payment allocation unit check (no test framework required)
 * Run: node scripts/test-allocation.mjs
 */

const ALLOCATION_ORDER = [
  'fine',
  'previousDue',
  'rent',
  'electricity',
  'water',
  'maintenance',
  'maintenanceRecovery',
  'other',
];

function allocatePayment(lines, paymentAmount) {
  const result = lines.map((l) => ({ ...l }));
  let remaining = paymentAmount;
  let allocated = 0;

  for (const key of ALLOCATION_ORDER) {
    if (remaining <= 0) break;
    const line = result.find((l) => l.key === key);
    if (!line || line.remaining <= 0) continue;
    const apply = Math.min(line.remaining, remaining);
    line.paid += apply;
    line.remaining -= apply;
    remaining -= apply;
    allocated += apply;
  }

  // Any leftover line keys not in order
  if (remaining > 0) {
    for (const line of result) {
      if (remaining <= 0) break;
      if (ALLOCATION_ORDER.includes(line.key)) continue;
      if (line.remaining <= 0) continue;
      const apply = Math.min(line.remaining, remaining);
      line.paid += apply;
      line.remaining -= apply;
      remaining -= apply;
      allocated += apply;
    }
  }

  const totalRemaining = result.reduce((s, l) => s + l.remaining, 0);
  return {
    lines: result,
    allocated,
    remainingPayment: remaining,
    totalRemaining,
  };
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('PASS:', msg);
  }
}

// Spec example: ₹5450 on fine 700, previousDue 1000, rent 10000, elec 2000, maint 1000
const lines = [
  { key: 'previousDue', label: 'Previous Due', amount: 1000, paid: 0, remaining: 1000 },
  { key: 'rent', label: 'Rent', amount: 10000, paid: 0, remaining: 10000 },
  { key: 'maintenance', label: 'Maintenance', amount: 1000, paid: 0, remaining: 1000 },
  { key: 'electricity', label: 'Electricity', amount: 2000, paid: 0, remaining: 2000 },
  { key: 'fine', label: 'Fine', amount: 700, paid: 0, remaining: 700 },
];

const r = allocatePayment(lines, 5450);
const byKey = Object.fromEntries(r.lines.map((l) => [l.key, l]));

assert(byKey.fine.paid === 700, 'Fine fully paid 700');
assert(byKey.previousDue.paid === 1000, 'Previous due fully paid 1000');
assert(byKey.rent.paid === 3750, 'Rent partial 3750');
assert(byKey.electricity.paid === 0, 'Electricity untouched');
assert(byKey.maintenance.paid === 0, 'Maintenance untouched');
assert(r.allocated === 5450, 'Allocated 5450');
assert(r.remainingPayment === 0, 'No overpayment');

// Overpay → remainingPayment
const r2 = allocatePayment(
  [{ key: 'rent', label: 'Rent', amount: 100, paid: 0, remaining: 100 }],
  150
);
assert(r2.remainingPayment === 50, 'Overpay 50 becomes advance candidate');
assert(r2.lines[0].remaining === 0, 'Rent fully paid on overpay');

if (process.exitCode) {
  console.error('\nAllocation tests FAILED');
  process.exit(1);
}
console.log('\nAll allocation checks passed.');

/**
 * HOUSEYE.COM — Locked payment allocation order
 *
 * 1. Fine
 * 2. Previous Due
 * 3. Rent
 * 4. Electricity
 * 5. Maintenance (incl. maintenanceRecovery)
 *
 * Deterministic. Owner-only override is separate.
 */

export const ALLOCATION_ORDER = [
  'fine',
  'previousDue',
  'rent',
  'electricity',
  'water',
  'maintenance',
  'maintenanceRecovery',
  'other',
] as const;

export type AllocationKey = (typeof ALLOCATION_ORDER)[number] | string;

export interface BillLineInput {
  key: string;
  label: string;
  amount: number;
  paid: number;
  remaining: number;
}

export interface AllocationResult {
  lines: BillLineInput[];
  allocated: number;
  remainingPayment: number; // becomes advance if > 0 after full allocation
  totalRemaining: number;
}

/**
 * Allocate a payment amount across bill lines in locked priority order.
 * Does not mutate originals — returns new line states.
 */
export function allocatePayment(
  lines: BillLineInput[],
  paymentAmount: number
): AllocationResult {
  if (paymentAmount < 0) {
    throw new Error('Payment amount cannot be negative');
  }

  // Sort by locked order; unknown keys go last preserving relative order
  const orderIndex = (key: string) => {
    const idx = ALLOCATION_ORDER.indexOf(key as (typeof ALLOCATION_ORDER)[number]);
    return idx === -1 ? 1000 : idx;
  };

  const sorted = [...lines].sort(
    (a, b) => orderIndex(a.key) - orderIndex(b.key)
  );

  let remaining = paymentAmount;
  const updated: BillLineInput[] = sorted.map((line) => {
    if (remaining <= 0 || line.remaining <= 0) {
      return { ...line };
    }
    const apply = Math.min(remaining, line.remaining);
    remaining -= apply;
    return {
      ...line,
      paid: line.paid + apply,
      remaining: line.remaining - apply,
    };
  });

  // Restore original order of keys as in input
  const keyOrder = lines.map((l) => l.key + '|' + l.label);
  updated.sort((a, b) => {
    const ia = keyOrder.indexOf(a.key + '|' + a.label);
    const ib = keyOrder.indexOf(b.key + '|' + b.label);
    return ia - ib;
  });

  const totalRemaining = updated.reduce((s, l) => s + l.remaining, 0);
  const allocated = paymentAmount - remaining;

  return {
    lines: updated,
    allocated,
    remainingPayment: remaining, // overpayment → advance
    totalRemaining,
  };
}

/**
 * Example from spec verification helper
 * Bill: previousDue 1000, rent 10000, maintenance 1000, electricity 2000, fine 700
 * Payment 5450 → fine 700, previousDue 1000, rent 3750
 */
export function verifySpecExample(): boolean {
  const lines: BillLineInput[] = [
    { key: 'previousDue', label: 'Previous Due', amount: 1000, paid: 0, remaining: 1000 },
    { key: 'rent', label: 'Rent', amount: 10000, paid: 0, remaining: 10000 },
    { key: 'maintenance', label: 'Maintenance', amount: 1000, paid: 0, remaining: 1000 },
    { key: 'electricity', label: 'Electricity', amount: 2000, paid: 0, remaining: 2000 },
    { key: 'fine', label: 'Fine', amount: 700, paid: 0, remaining: 700 },
  ];
  const result = allocatePayment(lines, 5450);
  const byKey = Object.fromEntries(result.lines.map((l) => [l.key, l]));

  return (
    byKey.fine.paid === 700 &&
    byKey.previousDue.paid === 1000 &&
    byKey.rent.paid === 3750 &&
    byKey.rent.remaining === 6250 &&
    byKey.electricity.paid === 0 &&
    byKey.maintenance.paid === 0 &&
    result.remainingPayment === 0 &&
    result.totalRemaining === 9250
  );
}

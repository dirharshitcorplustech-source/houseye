/**
 * HOUSEYE.COM — Login Lockout Logic
 * 5 consecutive failed attempts → 15 minute lock
 * Correct password does NOT bypass lockout period
 */

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES) || 15;

export function isAccountLocked(lockedUntil?: Date | null): boolean {
  if (!lockedUntil) return false;
  return new Date() < new Date(lockedUntil);
}

export function getLockoutRemainingMinutes(lockedUntil: Date): number {
  const remainingMs = new Date(lockedUntil).getTime() - Date.now();
  return Math.ceil(remainingMs / (1000 * 60));
}

export function calculateNewFailedAttempts(
  currentAttempts: number,
  lockedUntil?: Date | null
): { attempts: number; lockedUntil: Date | null } {
  // If currently locked, do not change counter
  if (isAccountLocked(lockedUntil)) {
    return { attempts: currentAttempts, lockedUntil: lockedUntil || null };
  }

  const attempts = currentAttempts + 1;

  if (attempts >= MAX_ATTEMPTS) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_MINUTES);
    return { attempts, lockedUntil: lockUntil };
  }

  return { attempts, lockedUntil: null };
}

export function resetFailedAttempts() {
  return { attempts: 0, lockedUntil: null };
}

export { MAX_ATTEMPTS, LOCKOUT_MINUTES };

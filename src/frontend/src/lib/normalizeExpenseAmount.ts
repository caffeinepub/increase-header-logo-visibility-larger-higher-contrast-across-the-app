/**
 * Normalizes expense amounts to handle historical data that may have been
 * affected by scaling issues (multiplied by 100).
 * 
 * Detection heuristic:
 * - If amount is >= 1000 and divisible by 100, it's likely affected
 * - Normalize by dividing by 100
 * - Otherwise, use the amount as-is
 * 
 * This ensures both new and historical records display correctly.
 */
export function normalizeExpenseAmount(amount: bigint | number): number {
  const numAmount = typeof amount === 'bigint' ? Number(amount) : amount;
  
  // If the amount is suspiciously large and divisible by 100,
  // it's likely been affected by the scaling issue
  if (numAmount >= 1000 && numAmount % 100 === 0) {
    const normalized = numAmount / 100;
    // Only normalize if the result is still a reasonable expense amount
    // (e.g., >= 10 EUR, which would have been stored as 1000)
    if (normalized >= 10) {
      return normalized;
    }
  }
  
  return numAmount;
}

/**
 * Formats a normalized expense amount for display with currency
 */
export function formatExpenseAmount(amount: bigint | number, currency: string = 'EUR'): string {
  const normalized = normalizeExpenseAmount(amount);
  return `${currency} ${normalized.toFixed(2)}`;
}

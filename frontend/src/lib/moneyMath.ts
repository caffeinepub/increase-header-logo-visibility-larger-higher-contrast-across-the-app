/**
 * Centralized money arithmetic helpers for frontend calculations.
 * All calculations operate on normalized cents (integer math).
 * 
 * IMPORTANT: Input amounts must already be normalized via moneyModel.normalizeBackendAmountToCents.
 */

/**
 * Sum an array of bigint cent values.
 * @param amounts - Array of amounts in cents (already normalized)
 * @returns Total in cents
 */
export function sumCents(amounts: bigint[]): bigint {
  return amounts.reduce((sum, amount) => sum + amount, BigInt(0));
}

/**
 * Sum an array of numeric cent values.
 * @param amounts - Array of amounts in cents (already normalized)
 * @returns Total in cents
 */
export function sumCentsNumeric(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Calculate percentage of one cent amount relative to another.
 * @param part - The partial amount in cents (already normalized)
 * @param total - The total amount in cents (already normalized)
 * @returns Percentage (0-100)
 */
export function calculatePercentage(part: bigint | number, total: bigint | number): number {
  const partNum = typeof part === 'bigint' ? Number(part) : part;
  const totalNum = typeof total === 'bigint' ? Number(total) : total;
  
  if (totalNum === 0) return 0;
  return Math.round((partNum / totalNum) * 100);
}

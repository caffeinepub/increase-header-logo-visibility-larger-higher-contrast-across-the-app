/**
 * Centralized money arithmetic helpers for frontend calculations.
 * All backend values are in cents (integer base units).
 * These helpers ensure calculations stay in cents until final display.
 */

/**
 * Sum an array of bigint cent values.
 * @param amounts - Array of amounts in cents
 * @returns Total in cents
 */
export function sumCents(amounts: bigint[]): bigint {
  return amounts.reduce((sum, amount) => sum + amount, BigInt(0));
}

/**
 * Sum an array of numeric cent values.
 * @param amounts - Array of amounts in cents
 * @returns Total in cents
 */
export function sumCentsNumeric(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Calculate percentage of one cent amount relative to another.
 * @param part - The partial amount in cents
 * @param total - The total amount in cents
 * @returns Percentage (0-100)
 */
export function calculatePercentage(part: bigint | number, total: bigint | number): number {
  const partNum = typeof part === 'bigint' ? Number(part) : part;
  const totalNum = typeof total === 'bigint' ? Number(total) : total;
  
  if (totalNum === 0) return 0;
  return Math.round((partNum / totalNum) * 100);
}

/**
 * Centralized money formatting and parsing utilities.
 * All monetary values in the backend are stored as cents (integer base units).
 * 
 * Example: 72299 cents = €722.99
 */

/**
 * Formats a cents value to a display string with currency symbol.
 * @param cents - The amount in cents (e.g., 72299 for €722.99)
 * @param currency - The currency code (default: 'EUR')
 * @returns Formatted string (e.g., "EUR 722.99")
 */
export function formatMoneyFromCents(cents: bigint | number, currency: string = 'EUR'): string {
  const numCents = typeof cents === 'bigint' ? Number(cents) : cents;
  const units = numCents / 100;
  return `${currency} ${units.toFixed(2)}`;
}

/**
 * Formats a cents value to a numeric display value (without currency).
 * @param cents - The amount in cents (e.g., 72299 for €722.99)
 * @returns Numeric value in units (e.g., 722.99)
 */
export function centsToUnits(cents: bigint | number): number {
  const numCents = typeof cents === 'bigint' ? Number(cents) : cents;
  return numCents / 100;
}

/**
 * Parses user input (decimal string) to integer cents for backend submission.
 * Validates input and rounds to nearest cent (2 decimal places max).
 * 
 * @param input - User-entered amount string (e.g., "10.50", "100")
 * @returns BigInt cents value (e.g., 1050n for "10.50")
 * @throws Error if input is invalid (empty, NaN, negative, or exceeds reasonable bounds)
 */
export function parseMoneyInputToCents(input: string): bigint {
  const trimmed = input.trim();
  
  if (!trimmed) {
    throw new Error('Amount cannot be empty');
  }
  
  const value = parseFloat(trimmed);
  
  if (isNaN(value)) {
    throw new Error('Amount must be a valid number');
  }
  
  if (value < 0) {
    throw new Error('Amount cannot be negative');
  }
  
  // Reasonable bounds: minimum 0.01 (1 cent), maximum 10,000,000.00 (1 billion cents)
  if (value < 0.01) {
    throw new Error('Amount must be at least 0.01');
  }
  
  if (value > 10_000_000) {
    throw new Error('Amount exceeds maximum allowed (10,000,000.00)');
  }
  
  // Round to nearest cent (2 decimal places)
  const cents = Math.round(value * 100);
  
  return BigInt(cents);
}

/**
 * Validates a money input string without throwing.
 * @param input - User-entered amount string
 * @returns Object with isValid flag and optional error message
 */
export function validateMoneyInput(input: string): { isValid: boolean; error?: string } {
  try {
    parseMoneyInputToCents(input);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
}

/**
 * Centralized money formatting and parsing utilities.
 * 
 * IMPORTANT: This module now delegates to moneyModel.ts for all conversions.
 * Use these functions for backward compatibility, but prefer moneyModel.ts directly.
 */

import { normalizeBackendAmountToCents, centsToDisplayUnits, formatCentsAsCurrency, parseUserInputToBackendAmount, validateUserInput as validateUserInputModel } from './moneyModel';

/**
 * Formats a backend amount to a display string with currency symbol.
 * @param backendAmount - The amount from backend (bigint or number)
 * @param currency - The currency code (default: 'EUR')
 * @param groupId - Optional group ID for per-group model selection
 * @returns Formatted string (e.g., "EUR 722.99")
 */
export function formatMoneyFromCents(backendAmount: bigint | number, currency: string = 'EUR', groupId?: string): string {
  const cents = normalizeBackendAmountToCents(backendAmount, groupId);
  return formatCentsAsCurrency(cents, currency);
}

/**
 * Converts a backend amount to display units (without currency symbol).
 * @param backendAmount - The amount from backend (bigint or number)
 * @param groupId - Optional group ID for per-group model selection
 * @returns Numeric value in units (e.g., 722.99)
 */
export function centsToUnits(backendAmount: bigint | number, groupId?: string): number {
  const cents = normalizeBackendAmountToCents(backendAmount, groupId);
  return centsToDisplayUnits(cents);
}

/**
 * Parses user input (decimal string) to backend-compatible bigint.
 * 
 * @param input - User-entered amount string (e.g., "10.50", "100")
 * @param groupId - Optional group ID for per-group model selection
 * @returns BigInt value in backend-expected format
 * @throws Error if input is invalid
 */
export function parseMoneyInputToCents(input: string, groupId?: string): bigint {
  return parseUserInputToBackendAmount(input, groupId);
}

/**
 * Validates a money input string without throwing.
 * @param input - User-entered amount string
 * @param groupId - Optional group ID
 * @returns Object with isValid flag and optional error message
 */
export function validateMoneyInput(input: string, groupId?: string): { isValid: boolean; error?: string } {
  return validateUserInputModel(input, groupId);
}

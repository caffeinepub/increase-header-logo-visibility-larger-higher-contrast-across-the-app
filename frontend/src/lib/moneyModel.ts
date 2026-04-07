/**
 * Centralized money model with compatibility layer for handling legacy data.
 * 
 * CRITICAL: This module provides a single source of truth for money conversion.
 * All monetary amounts from the backend must flow through these functions.
 * 
 * Backend stores amounts as bigint integers. The interpretation depends on the money model:
 * - CENTS model: backend value is cents (e.g., 72299 = €722.99)
 * - UNITS model: backend value is whole units (e.g., 100 = €100.00)
 * 
 * This compatibility layer allows deterministic normalization without backend migration.
 */

export type MoneyModel = 'cents' | 'units';

/**
 * Global money model configuration.
 * Default: 'cents' (backend stores cents, divide by 100 for display)
 * 
 * This can be overridden per-group if needed for legacy data compatibility.
 */
let globalMoneyModel: MoneyModel = 'cents';

/**
 * Per-group money model overrides for handling mixed legacy data.
 * Key: groupId, Value: money model for that group
 */
const groupMoneyModelOverrides = new Map<string, MoneyModel>();

/**
 * Set the global money model (affects all groups unless overridden).
 * @param model - The money model to use globally
 */
export function setGlobalMoneyModel(model: MoneyModel): void {
  globalMoneyModel = model;
}

/**
 * Get the current global money model.
 */
export function getGlobalMoneyModel(): MoneyModel {
  return globalMoneyModel;
}

/**
 * Set a per-group money model override.
 * @param groupId - The group ID
 * @param model - The money model for this specific group
 */
export function setGroupMoneyModel(groupId: string, model: MoneyModel): void {
  groupMoneyModelOverrides.set(groupId, model);
}

/**
 * Get the money model for a specific group (falls back to global if not overridden).
 * @param groupId - The group ID (optional)
 */
export function getMoneyModel(groupId?: string): MoneyModel {
  if (groupId && groupMoneyModelOverrides.has(groupId)) {
    return groupMoneyModelOverrides.get(groupId)!;
  }
  return globalMoneyModel;
}

/**
 * Clear all group-specific money model overrides.
 */
export function clearGroupMoneyModelOverrides(): void {
  groupMoneyModelOverrides.clear();
}

/**
 * Normalize a backend amount to cents based on the money model.
 * This is the SINGLE normalization point - all backend amounts must flow through here.
 * 
 * @param backendAmount - Raw amount from backend (bigint or number)
 * @param groupId - Optional group ID for per-group model selection
 * @returns Amount in cents (number)
 */
export function normalizeBackendAmountToCents(
  backendAmount: bigint | number,
  groupId?: string
): number {
  const numValue = typeof backendAmount === 'bigint' ? Number(backendAmount) : backendAmount;
  const model = getMoneyModel(groupId);
  
  if (model === 'cents') {
    // Backend already stores cents, return as-is
    return numValue;
  } else {
    // Backend stores whole units, convert to cents
    return numValue * 100;
  }
}

/**
 * Convert normalized cents to display units (euros/dollars).
 * This is the SINGLE display conversion point.
 * 
 * @param cents - Amount in cents (already normalized)
 * @returns Amount in display units (e.g., 722.99 for 72299 cents)
 */
export function centsToDisplayUnits(cents: number): number {
  return cents / 100;
}

/**
 * Format normalized cents as a currency string.
 * @param cents - Amount in cents (already normalized)
 * @param currency - Currency code (default: 'EUR')
 * @returns Formatted string (e.g., "EUR 722.99")
 */
export function formatCentsAsCurrency(cents: number, currency: string = 'EUR'): string {
  const units = centsToDisplayUnits(cents);
  return `${currency} ${units.toFixed(2)}`;
}

/**
 * Parse user input (decimal string) to backend-compatible bigint.
 * The output format depends on the current money model.
 * 
 * @param input - User-entered amount string (e.g., "10.50", "100")
 * @param groupId - Optional group ID for per-group model selection
 * @returns BigInt value in backend-expected format
 * @throws Error if input is invalid
 */
export function parseUserInputToBackendAmount(input: string, groupId?: string): bigint {
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
  
  // Reasonable bounds: minimum 0.01, maximum 10,000,000.00
  if (value < 0.01) {
    throw new Error('Amount must be at least 0.01');
  }
  
  if (value > 10_000_000) {
    throw new Error('Amount exceeds maximum allowed (10,000,000.00)');
  }
  
  const model = getMoneyModel(groupId);
  
  if (model === 'cents') {
    // Backend expects cents: convert user input to cents
    const cents = Math.round(value * 100);
    return BigInt(cents);
  } else {
    // Backend expects whole units: round to 2 decimals but store as-is
    const rounded = Math.round(value * 100) / 100;
    return BigInt(Math.round(rounded * 100)); // Still store as cents internally for precision
  }
}

/**
 * Validate user input without throwing.
 * @param input - User-entered amount string
 * @param groupId - Optional group ID
 * @returns Object with isValid flag and optional error message
 */
export function validateUserInput(input: string, groupId?: string): { isValid: boolean; error?: string } {
  try {
    parseUserInputToBackendAmount(input, groupId);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
}

/**
 * Heuristic detection: Attempt to guess if a backend value is in cents or units.
 * This is a FALLBACK for migration scenarios only.
 * 
 * Logic:
 * - Values < 100: likely whole units (e.g., 1, 2, 50)
 * - Values >= 100 with last 2 digits != 00: likely cents (e.g., 72299, 10050)
 * - Values >= 100 with last 2 digits == 00: ambiguous, default to cents
 * 
 * @param backendAmount - Raw backend amount
 * @returns Detected money model
 */
export function detectMoneyModel(backendAmount: bigint | number): MoneyModel {
  const numValue = typeof backendAmount === 'bigint' ? Number(backendAmount) : backendAmount;
  
  // Values less than 100 are likely whole units (e.g., 1, 2, 50 euros)
  if (numValue < 100) {
    return 'units';
  }
  
  // Values >= 100 with non-zero cents portion are likely in cents
  if (numValue % 100 !== 0) {
    return 'cents';
  }
  
  // Ambiguous case (e.g., 10000 could be 100.00 euros or 10000 cents)
  // Default to cents for safety
  return 'cents';
}

/**
 * Auto-detect and normalize a backend amount using heuristics.
 * USE WITH CAUTION: This is a fallback for migration scenarios.
 * Prefer explicit model selection via setGroupMoneyModel.
 * 
 * @param backendAmount - Raw backend amount
 * @param groupId - Optional group ID
 * @returns Amount in cents (normalized)
 */
export function autoNormalizeBackendAmount(
  backendAmount: bigint | number,
  groupId?: string
): number {
  // If we have an explicit model for this group, use it
  if (groupId && groupMoneyModelOverrides.has(groupId)) {
    return normalizeBackendAmountToCents(backendAmount, groupId);
  }
  
  // Otherwise, attempt heuristic detection
  const detectedModel = detectMoneyModel(backendAmount);
  const numValue = typeof backendAmount === 'bigint' ? Number(backendAmount) : backendAmount;
  
  if (detectedModel === 'cents') {
    return numValue;
  } else {
    return numValue * 100;
  }
}

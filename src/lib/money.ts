import Decimal from "decimal.js";

// Configure Decimal.js for precise financial math
// 28 decimal places of precision, ROUND_HALF_EVEN (banker's rounding)
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -14,
  toExpPos: 28,
});

/**
 * Validates that a string is a valid non-empty decimal representation.
 * Reject exponential notation, NaN, Infinity, and non-numeric strings.
 */
export function isValidDecimalString(val: string): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  // Strict regex for optional sign and decimal number (no scientific notation)
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
  try {
    const d = new Decimal(trimmed);
    return d.isFinite();
  } catch {
    return false;
  }
}

/**
 * Ensures input is a validated decimal string, throwing an explicit error otherwise.
 */
function toDecimal(val: string): Decimal {
  if (!isValidDecimalString(val)) {
    throw new Error(`Invalid monetary decimal string: "${val}"`);
  }
  return new Decimal(val.trim());
}

/**
 * Adds two decimal strings.
 * @returns Decimal string result
 */
export function moneyAdd(a: string, b: string): string {
  return toDecimal(a).plus(toDecimal(b)).toFixed();
}

/**
 * Subtracts b from a (a - b).
 * @returns Decimal string result
 */
export function moneySubtract(a: string, b: string): string {
  return toDecimal(a).minus(toDecimal(b)).toFixed();
}

/**
 * Multiplies two decimal strings.
 * @returns Decimal string result
 */
export function moneyMultiply(a: string, b: string, precision?: number): string {
  const result = toDecimal(a).times(toDecimal(b));
  return precision !== undefined ? result.toFixed(precision) : result.toFixed();
}

/**
 * Divides a by b (a / b).
 * Throws if b is zero.
 * @returns Decimal string result
 */
export function moneyDivide(a: string, b: string, precision: number = 4): string {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    throw new Error("Division by zero in monetary calculation");
  }
  return toDecimal(a).dividedBy(divisor).toFixed(precision);
}

/**
 * Sums an array of decimal strings.
 * Returns "0" for an empty array.
 */
export function moneySum(amounts: readonly string[]): string {
  if (!amounts || amounts.length === 0) return "0";
  let total = new Decimal(0);
  for (const amount of amounts) {
    total = total.plus(toDecimal(amount));
  }
  return total.toFixed();
}

/**
 * Compares two decimal strings.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function moneyCompare(a: string, b: string): number {
  return toDecimal(a).comparedTo(toDecimal(b));
}

export function moneyIsEqual(a: string, b: string): boolean {
  return toDecimal(a).equals(toDecimal(b));
}

export function moneyIsGreaterThan(a: string, b: string): boolean {
  return toDecimal(a).greaterThan(toDecimal(b));
}

export function moneyIsGreaterThanOrEqual(a: string, b: string): boolean {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

export function moneyIsLessThan(a: string, b: string): boolean {
  return toDecimal(a).lessThan(toDecimal(b));
}

export function moneyIsLessThanOrEqual(a: string, b: string): boolean {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b));
}

export function moneyIsZero(a: string): boolean {
  return toDecimal(a).isZero();
}

export function moneyIsPositive(a: string): boolean {
  return toDecimal(a).isPositive() && !toDecimal(a).isZero();
}

export function moneyIsNegative(a: string): boolean {
  return toDecimal(a).isNegative();
}

export function moneyAbs(a: string): string {
  return toDecimal(a).abs().toFixed();
}

export function moneyNegate(a: string): string {
  return toDecimal(a).negated().toFixed();
}

/**
 * Formats a monetary decimal string for display with thousands separators and fixed decimal places.
 * E.g., "1234567.89" -> "1,234,567.89"
 */
export function formatMoney(
  amount: string,
  options?: {
    currency?: string;
    decimals?: number;
  }
): string {
  const d = toDecimal(amount);
  const decimals = options?.decimals ?? 2;
  const fixed = d.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");

  const sign = intPart?.startsWith("-") ? "-" : "";
  const absInt = intPart?.replace(/^-/, "") ?? "0";
  const formattedInt = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const formattedNumber = decPart !== undefined ? `${sign}${formattedInt}.${decPart}` : `${sign}${formattedInt}`;

  if (options?.currency) {
    return `${options.currency} ${formattedNumber}`;
  }
  return formattedNumber;
}

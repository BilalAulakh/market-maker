import { describe, it, expect } from "vitest";
import {
  moneyAdd,
  moneySubtract,
  moneyMultiply,
  moneyDivide,
  moneySum,
  moneyCompare,
  moneyIsEqual,
  moneyIsGreaterThan,
  moneyIsGreaterThanOrEqual,
  moneyIsLessThan,
  moneyIsLessThanOrEqual,
  moneyIsZero,
  moneyIsPositive,
  moneyIsNegative,
  moneyAbs,
  moneyNegate,
  formatMoney,
  isValidDecimalString,
} from "@/lib/money";

describe("Decimal Monetary Operations (money.ts)", () => {
  describe("isValidDecimalString", () => {
    it("should accept valid decimal strings", () => {
      expect(isValidDecimalString("100")).toBe(true);
      expect(isValidDecimalString("100.50")).toBe(true);
      expect(isValidDecimalString("-45.123456")).toBe(true);
      expect(isValidDecimalString("0")).toBe(true);
      expect(isValidDecimalString("0.00000001")).toBe(true);
      expect(isValidDecimalString(" 123.45 ")).toBe(true);
    });

    it("should reject invalid strings and scientific notation", () => {
      expect(isValidDecimalString("")).toBe(false);
      expect(isValidDecimalString("abc")).toBe(false);
      expect(isValidDecimalString("1e5")).toBe(false);
      expect(isValidDecimalString("1.2.3")).toBe(false);
      expect(isValidDecimalString("$100")).toBe(false);
      expect(isValidDecimalString("NaN")).toBe(false);
      expect(isValidDecimalString("Infinity")).toBe(false);
    });
  });

  describe("Arithmetic Precision & Floating-Point Avoidance", () => {
    it("should avoid IEEE 754 floating point errors (0.1 + 0.2 = 0.3)", () => {
      const result = moneyAdd("0.1", "0.2");
      expect(result).toBe("0.3");
      expect(result).not.toBe("0.30000000000000004");
    });

    it("should accurately subtract decimals without precision loss", () => {
      const result = moneySubtract("1.0", "0.9");
      expect(result).toBe("0.1");
      expect(result).not.toBe("0.09999999999999998");
    });

    it("should multiply with exact precision", () => {
      const result = moneyMultiply("12.345", "67.891");
      expect(result).toBe("838.114395");
    });

    it("should divide with specified precision and handle repeating decimals", () => {
      const result = moneyDivide("100", "3", 4);
      expect(result).toBe("33.3333");
    });

    it("should throw error on division by zero", () => {
      expect(() => moneyDivide("100", "0")).toThrow("Division by zero in monetary calculation");
    });

    it("should correctly sum a list of decimal strings", () => {
      const entries = [
        "100.50",
        "250.25",
        "-50.00",
        "1000.0001",
        "-300.7501",
      ];
      expect(moneySum(entries)).toBe("1000");
    });

    it("should return '0' for empty sum", () => {
      expect(moneySum([])).toBe("0");
    });
  });

  describe("Comparisons & Predicates", () => {
    it("should compare decimal strings correctly", () => {
      expect(moneyCompare("10.5", "10.5")).toBe(0);
      expect(moneyCompare("10.5", "5.2")).toBe(1);
      expect(moneyCompare("5.2", "10.5")).toBe(-1);
    });

    it("should verify equality and inequalities", () => {
      expect(moneyIsEqual("100.00", "100")).toBe(true);
      expect(moneyIsGreaterThan("100.01", "100.00")).toBe(true);
      expect(moneyIsGreaterThanOrEqual("100.00", "100")).toBe(true);
      expect(moneyIsLessThan("99.99", "100.00")).toBe(true);
      expect(moneyIsLessThanOrEqual("100.00", "100.00")).toBe(true);
    });

    it("should check zero, positive, and negative", () => {
      expect(moneyIsZero("0.0000")).toBe(true);
      expect(moneyIsZero("0")).toBe(true);
      expect(moneyIsZero("0.01")).toBe(false);

      expect(moneyIsPositive("15.50")).toBe(true);
      expect(moneyIsPositive("0")).toBe(false);
      expect(moneyIsPositive("-15.50")).toBe(false);

      expect(moneyIsNegative("-0.01")).toBe(true);
      expect(moneyIsNegative("0")).toBe(false);
      expect(moneyIsNegative("100")).toBe(false);
    });

    it("should compute absolute and negated values", () => {
      expect(moneyAbs("-150.25")).toBe("150.25");
      expect(moneyAbs("150.25")).toBe("150.25");
      expect(moneyNegate("150.25")).toBe("-150.25");
      expect(moneyNegate("-150.25")).toBe("150.25");
    });
  });

  describe("Formatting", () => {
    it("should format amounts with thousand separators and default decimals", () => {
      expect(formatMoney("1234567.89")).toBe("1,234,567.89");
      expect(formatMoney("1000")).toBe("1,000.00");
      expect(formatMoney("-50000.5")).toBe("-50,000.50");
    });

    it("should format with currency prefix and custom decimal precision", () => {
      expect(formatMoney("1234.5678", { currency: "USD", decimals: 4 })).toBe("USD 1,234.5678");
      expect(formatMoney("99.9", { currency: "EUR", decimals: 2 })).toBe("EUR 99.90");
    });
  });
});

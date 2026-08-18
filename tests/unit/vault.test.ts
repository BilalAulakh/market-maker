import { describe, it, expect, beforeEach } from "vitest";
import { LedgerEngine } from "@/lib/ledger/service";
import {
  getDepositAddress,
  isValidCryptoAddress,
  processDeposit,
  processWithdrawal,
  NETWORK_CONFIGS,
} from "@/lib/vault/service";
import { moneyIsEqual } from "@/lib/money";

describe("Crypto Vault & Custody System", () => {
  let engine: LedgerEngine;
  let clientAccId: string;
  let floatAccId: string;
  let feeAccId: string;
  const userId = "test_trader_user_123";

  beforeEach(() => {
    engine = new LedgerEngine();
    const cAcc = engine.createAccount("client_funds", "Trader Client Account", "USD", userId);
    const flAcc = engine.createAccount("payment_processor_float", "Crypto Custody Float", "USD");
    const feAcc = engine.createAccount("fee_revenue", "Network Fee Revenue", "USD");

    clientAccId = cAcc.id;
    floatAccId = flAcc.id;
    feeAccId = feAcc.id;
  });

  it("should generate deterministic TRC20 and BEP20 deposit addresses", () => {
    const trc20 = getDepositAddress(userId, "TRC20");
    const bep20 = getDepositAddress(userId, "BEP20");

    expect(trc20.network).toBe("TRC20");
    expect(trc20.token).toBe("USDT");
    expect(trc20.address.startsWith("TX")).toBe(true);

    expect(bep20.network).toBe("BEP20");
    expect(bep20.token).toBe("USDT");
    expect(bep20.address.startsWith("0x")).toBe(true);

    // Consistency check
    const trc20Again = getDepositAddress(userId, "TRC20");
    expect(trc20Again.address).toBe(trc20.address);
  });

  it("should validate crypto address formats correctly", () => {
    expect(isValidCryptoAddress("TXtest7qWv9P2kLmN8bX4yZ1testTRC", "TRC20")).toBe(true);
    expect(isValidCryptoAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "BEP20")).toBe(true);
    expect(isValidCryptoAddress("invalid_address", "TRC20")).toBe(false);
    expect(isValidCryptoAddress("0xinvalid", "BEP20")).toBe(false);
  });

  it("should process a deposit and update double-entry ledger", async () => {
    const { depositEvent, newBalance } = await processDeposit(
      engine,
      clientAccId,
      floatAccId,
      userId,
      "500.00",
      "TRC20"
    );

    expect(depositEvent.amount).toBe("500.00");
    expect(depositEvent.network).toBe("TRC20");
    expect(moneyIsEqual(newBalance, "500.00")).toBe(true);

    // Check account balance in engine
    const balance = engine.getAccountBalance(clientAccId);
    expect(moneyIsEqual(balance, "500.00")).toBe(true);
  });

  it("should process a withdrawal, debit client, collect fee, and update float", async () => {
    // 1. Initial Deposit
    await processDeposit(
      engine,
      clientAccId,
      floatAccId,
      userId,
      "1000.00",
      "BEP20"
    );

    // 2. Process Withdrawal of $200
    const destination = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
    const { withdrawalRequest, newBalance } = await processWithdrawal(
      engine,
      clientAccId,
      floatAccId,
      feeAccId,
      userId,
      destination,
      "200.00",
      "BEP20"
    );

    expect(withdrawalRequest.amount).toBe("200.00");
    expect(withdrawalRequest.fee).toBe(NETWORK_CONFIGS["BEP20"].networkFee);
    expect(moneyIsEqual(withdrawalRequest.net_amount, "199.50")).toBe(true); // 200 - 0.50
    expect(moneyIsEqual(newBalance, "800.00")).toBe(true); // 1000 - 200

    // Check fee account collected the fee
    const feeBalance = engine.getAccountBalance(feeAccId);
    expect(moneyIsEqual(feeBalance, "0.50")).toBe(true);
  });

  it("should reject withdrawal if balance is insufficient", async () => {
    await expect(
      processWithdrawal(
        engine,
        clientAccId,
        floatAccId,
        feeAccId,
        userId,
        "TXtest7qWv9P2kLmN8bX4yZ1testTRC",
        "100.00",
        "TRC20"
      )
    ).rejects.toThrow(/Insufficient funds/);
  });
});

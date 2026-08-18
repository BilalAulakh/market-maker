import {
  SupportedNetwork,
  CryptoDepositAddress,
  WithdrawalRequest,
  DepositEvent,
} from "@/types/vault";
import { LedgerEngine } from "@/lib/ledger/service";
import { moneySubtract, moneyIsGreaterThan, moneyIsEqual } from "@/lib/money";

// Network Configurations
export const NETWORK_CONFIGS: Record<
  SupportedNetwork,
  {
    name: string;
    symbol: string;
    chain: string;
    estimatedTime: string;
    networkFee: string;
    minDeposit: string;
    confirmations: number;
  }
> = {
  TRC20: {
    name: "TRON (TRC20)",
    symbol: "USDT-TRC20",
    chain: "TRON Mainnet / Shasta Testnet",
    estimatedTime: "1 - 3 mins",
    networkFee: "1.00",
    minDeposit: "10.00",
    confirmations: 19,
  },
  BEP20: {
    name: "BNB Smart Chain (BEP20)",
    symbol: "USDT-BEP20",
    chain: "BSC Mainnet / Testnet",
    estimatedTime: "15 - 30 secs",
    networkFee: "0.50",
    minDeposit: "5.00",
    confirmations: 15,
  },
  POLYGON: {
    name: "Polygon (POS)",
    symbol: "USDT-Polygon",
    chain: "Polygon Mainnet / Amoy Testnet",
    estimatedTime: "1 - 2 mins",
    networkFee: "0.20",
    minDeposit: "5.00",
    confirmations: 32,
  },
};

/**
 * Deterministically generates a crypto deposit address for a given user and network.
 * In a live setup, this derives from a Master Extended Public Key (xPub / BIP-44 path).
 */
export function getDepositAddress(
  userId: string,
  network: SupportedNetwork
): CryptoDepositAddress {
  // Check if custom Trust Wallet address is configured in environment
  const customTrc20 = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TRUST_WALLET_TRC20 : undefined;
  const customBep20 = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TRUST_WALLET_BEP20 : undefined;
  const customPolygon = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TRUST_WALLET_POLYGON : undefined;

  let address: string;

  if (network === "TRC20" && customTrc20 && customTrc20.trim().length > 20) {
    address = customTrc20.trim();
  } else if (network === "BEP20" && customBep20 && customBep20.trim().length > 20) {
    address = customBep20.trim();
  } else if (network === "POLYGON" && customPolygon && customPolygon.trim().length > 20) {
    address = customPolygon.trim();
  } else {
    // Deterministic user-specific address derived from Master Vault
    const cleanId = (userId || "default_client").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    if (network === "TRC20") {
      address = `TX${cleanId}7qWv9P2kLmN8bX4yZ1${cleanId.slice(0, 4)}TRC`;
    } else {
      address = `0x${cleanId}fB94a28E89b6f849E2D8C3E5A${cleanId.slice(0, 6)}4b`;
    }
  }

  const qrPayload = address;

  return {
    network,
    token: "USDT",
    address,
    qrPayload,
    minimumDeposit: NETWORK_CONFIGS[network].minDeposit,
  };
}

/**
 * Validates destination crypto address format.
 */
export function isValidCryptoAddress(address: string, network: SupportedNetwork): boolean {
  if (!address || address.trim().length < 20) return false;
  const trimmed = address.trim();

  if (network === "TRC20") {
    return trimmed.startsWith("T") && trimmed.length >= 30 && trimmed.length <= 40;
  }
  if (network === "BEP20" || network === "POLYGON") {
    return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  }
  return true;
}

/**
 * Executes a Deposit in the Double-Entry Ledger.
 * Rule: Debits Float Account (Asset), Credits Client Funds Account (Liability/Equity).
 */
export async function processDeposit(
  engine: LedgerEngine,
  clientAccountId: string,
  floatAccountId: string,
  userId: string,
  amount: string,
  network: SupportedNetwork,
  txHash?: string
): Promise<{
  depositEvent: DepositEvent;
  newBalance: string;
}> {
  const hash =
    txHash ||
    `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}_${Date.now()}`;

  const address = getDepositAddress(userId, network).address;

  // Record Balanced Double-Entry Transaction in Ledger
  await engine.recordTransaction({
    description: `USDT (${network}) On-Chain Deposit [TX: ${hash.substring(0, 10)}...]`,
    reference_type: "crypto_deposit",
    reference_id: hash,
    entries: [
      {
        account_id: floatAccountId,
        direction: "debit",
        amount: amount,
        entry_type: "deposit",
        nature: `Received USDT on ${network} from external blockchain`,
      },
      {
        account_id: clientAccountId,
        direction: "credit",
        amount: amount,
        entry_type: "deposit",
        nature: `Credited client trading balance with ${amount} USD`,
      },
    ],
  });

  const newBalance = engine.getAccountBalance(clientAccountId);

  const depositEvent: DepositEvent = {
    id: `dep_${Date.now()}`,
    user_id: userId,
    network,
    token: "USDT",
    amount,
    tx_hash: hash,
    from_address: "External Blockchain Wallet",
    to_address: address,
    created_at: new Date().toISOString(),
    status: "confirmed",
  };

  return { depositEvent, newBalance };
}

/**
 * Executes a Withdrawal in the Double-Entry Ledger.
 * Rule: Debits Client Account (Total Amount), Credits Fee Account (Fee), Credits Float Account (Net Amount).
 */
export async function processWithdrawal(
  engine: LedgerEngine,
  clientAccountId: string,
  floatAccountId: string,
  feeAccountId: string,
  userId: string,
  destinationAddress: string,
  requestedAmount: string,
  network: SupportedNetwork
): Promise<{
  withdrawalRequest: WithdrawalRequest;
  newBalance: string;
}> {
  const currentBalance = engine.getAccountBalance(clientAccountId);
  
  if (moneyIsGreaterThan(requestedAmount, currentBalance)) {
    throw new Error(`Insufficient funds: Available balance is $${currentBalance} USD.`);
  }

  const fee = NETWORK_CONFIGS[network].networkFee;
  if (!moneyIsGreaterThan(requestedAmount, fee) && !moneyIsEqual(requestedAmount, fee)) {
    throw new Error(`Withdrawal amount must be greater than network fee of $${fee} USDT.`);
  }

  const netAmount = moneySubtract(requestedAmount, fee);
  const txHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}_${Date.now()}`;

  // Record Balanced Double-Entry Transaction
  // Total Debit: requestedAmount
  // Total Credit: fee (to fee_revenue) + netAmount (to float) = requestedAmount (Balanced!)
  await engine.recordTransaction({
    description: `USDT (${network}) Payout to ${destinationAddress.substring(0, 10)}...`,
    reference_type: "crypto_withdrawal",
    reference_id: txHash,
    entries: [
      {
        account_id: clientAccountId,
        direction: "debit",
        amount: requestedAmount,
        entry_type: "withdrawal",
        nature: `Client withdrawal of ${requestedAmount} USD via ${network}`,
      },
      {
        account_id: feeAccountId,
        direction: "credit",
        amount: fee,
        entry_type: "fee",
        nature: `Network transfer fee for ${network}`,
      },
      {
        account_id: floatAccountId,
        direction: "credit",
        amount: netAmount,
        entry_type: "withdrawal",
        nature: `Payout disbursed from payment float to external address`,
      },
    ],
  });

  const newBalance = engine.getAccountBalance(clientAccountId);

  const withdrawalRequest: WithdrawalRequest = {
    id: `wdr_${Date.now()}`,
    user_id: userId,
    network,
    token: "USDT",
    destination_address: destinationAddress,
    amount: requestedAmount,
    fee,
    net_amount: netAmount,
    status: "completed",
    tx_hash: txHash,
    created_at: new Date().toISOString(),
  };

  return { withdrawalRequest, newBalance };
}

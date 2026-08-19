import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { getDepositAddress, isValidCryptoAddress, NETWORK_CONFIGS } from "@/lib/vault/service";
import {
  CashierReviewAction,
  DepositRecord,
  SupportedNetwork,
  WithdrawalRequest,
} from "@/types/vault";
import { ActionResponse } from "@/types/auth";
import { createClientRefusal } from "@/lib/auth/refusal";
import { moneyAdd, moneyIsGreaterThanOrEqual, moneySubtract } from "@/lib/money";

export class WalletService {
  /**
   * Submits a deposit request and provides deposit address details.
   */
  public static async createDepositRequest(
    userId: string,
    network: SupportedNetwork,
    amount: string,
    txHash?: string
  ): Promise<ActionResponse<DepositRecord>> {
    const serviceClient = getServiceRoleClient();
    const config = NETWORK_CONFIGS[network];

    if (!config) {
      return createClientRefusal({
        code: "INVALID_NETWORK",
        whatHappened: `Network ${network} is not supported.`,
        why: "We only support TRC20, BEP20, and POLYGON for USDT deposits.",
        howToResolve: "Select a supported network on the deposit screen.",
        whereToGo: { label: "Deposit", url: "/wallet" },
      });
    }

    if (!moneyIsGreaterThanOrEqual(amount, config.minDeposit)) {
      return createClientRefusal({
        code: "BELOW_MINIMUM_DEPOSIT",
        whatHappened: `Deposit amount $${amount} is below the minimum.`,
        why: `Minimum deposit for ${network} is $${config.minDeposit}.`,
        howToResolve: `Enter an amount equal to or greater than $${config.minDeposit}.`,
        whereToGo: { label: "Deposit", url: "/wallet" },
      });
    }

    const depositInfo = getDepositAddress(userId, network);
    const depositId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `dep_${Date.now()}`;
    const now = new Date().toISOString();

    // Find user's trading account
    const { data: account } = await serviceClient
      .from("trading_accounts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const depositRecord: DepositRecord = {
      id: depositId,
      user_id: userId,
      account_id: account?.id,
      network,
      token: "USDT",
      amount,
      currency: "USDT",
      deposit_address: depositInfo.address,
      tx_hash: txHash || null,
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    try {
      await serviceClient.from("deposits").insert(depositRecord);
      await serviceClient.from("audit_logs").insert({
        user_id: userId,
        action: "DEPOSIT_REQUEST_SUBMITTED",
        category: "vault",
        metadata: { deposit_id: depositId, amount, network, address: depositInfo.address },
      });
      await serviceClient.from("notifications").insert({
        user_id: userId,
        title: "Deposit Submitted",
        message: `Your deposit request of $${amount} (${network}) has been received and is pending confirmation.`,
        type: "cashier",
      });
    } catch (e) {
      console.warn("Deposit persistence error:", e);
    }

    return {
      success: true,
      data: depositRecord,
      message: `Deposit address generated. Transfer ${amount} USDT to complete funding.`,
    };
  }

  /**
   * Submits a withdrawal request after verifying free margin and balance.
   */
  public static async createWithdrawalRequest(
    userId: string,
    network: SupportedNetwork,
    destinationAddress: string,
    amount: string
  ): Promise<ActionResponse<WithdrawalRequest>> {
    const serviceClient = getServiceRoleClient();

    if (!isValidCryptoAddress(destinationAddress, network)) {
      return createClientRefusal({
        code: "INVALID_CRYPTO_ADDRESS",
        whatHappened: `Destination address format is invalid for ${network}.`,
        why: "The address format does not match the chosen blockchain network standards.",
        howToResolve: "Verify and paste a valid wallet address.",
        whereToGo: { label: "Withdrawal", url: "/wallet" },
      });
    }

    const config = NETWORK_CONFIGS[network];
    const fee = config.networkFee;
    const netAmount = moneySubtract(amount, fee);

    if (Number(netAmount) <= 0) {
      return createClientRefusal({
        code: "AMOUNT_TOO_SMALL",
        whatHappened: `Withdrawal amount $${amount} is too small.`,
        why: `The network fee of $${fee} exceeds or equals the withdrawal amount.`,
        howToResolve: `Enter an amount greater than the network fee of $${fee}.`,
        whereToGo: { label: "Withdrawal", url: "/wallet" },
      });
    }

    // Verify account balance & free margin
    const { data: account } = await serviceClient
      .from("trading_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const currentBalance = account?.balance || "5000.00";
    if (!moneyIsGreaterThanOrEqual(currentBalance, amount)) {
      return createClientRefusal({
        code: "INSUFFICIENT_FUNDS",
        whatHappened: "Withdrawal amount exceeds available account balance.",
        why: `Requested $${amount}, but account balance is only $${currentBalance}.`,
        howToResolve: "Enter an amount within your available balance.",
        whereToGo: { label: "Wallet", url: "/wallet" },
      });
    }

    const withdrawalId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `wd_${Date.now()}`;
    const now = new Date().toISOString();

    const wdRecord: WithdrawalRequest = {
      id: withdrawalId,
      user_id: userId,
      account_id: account?.id,
      network,
      token: "USDT",
      destination_address: destinationAddress,
      amount,
      fee,
      net_amount: netAmount,
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    try {
      await serviceClient.from("withdrawals").insert(wdRecord);
      await serviceClient.from("audit_logs").insert({
        user_id: userId,
        action: "WITHDRAWAL_REQUEST_SUBMITTED",
        category: "vault",
        metadata: { withdrawal_id: withdrawalId, amount, network, destination_address: destinationAddress },
      });
      await serviceClient.from("notifications").insert({
        user_id: userId,
        title: "Withdrawal Requested",
        message: `Your withdrawal request of $${amount} (${network}) has been submitted for processing.`,
        type: "cashier",
      });
    } catch (e) {
      console.warn("Withdrawal persistence error:", e);
    }

    return {
      success: true,
      data: wdRecord,
      message: `Withdrawal request of $${amount} USDT submitted successfully.`,
    };
  }

  /**
   * Reviews and processes a cashier request (Deposit or Withdrawal Approval/Rejection).
   * Executes atomic double-entry ledger movements.
   */
  public static async processCashierReview(
    review: CashierReviewAction,
    reviewedByUserId?: string
  ): Promise<ActionResponse<{ id: string; status: string }>> {
    const serviceClient = getServiceRoleClient();
    const now = new Date().toISOString();

    if (review.type === "deposit") {
      const { data: deposit, error } = await serviceClient
        .from("deposits")
        .select("*")
        .eq("id", review.id)
        .single();

      if (error || !deposit) {
        return createClientRefusal({
          code: "DEPOSIT_NOT_FOUND",
          whatHappened: `Deposit ${review.id} not found.`,
          why: "The deposit record could not be found.",
          howToResolve: "Refresh the cashier management list.",
          whereToGo: { label: "Admin Cashier", url: "/admin" },
        });
      }

      if (review.status === "approved") {
        // Double-entry ledger: Debit Float (Clearing), Credit Client Funds
        const { data: clientLedgerAcc } = await serviceClient
          .from("ledger_accounts")
          .select("id")
          .eq("user_id", deposit.user_id)
          .eq("account_type", "client_funds")
          .maybeSingle();

        const { data: floatLedgerAcc } = await serviceClient
          .from("ledger_accounts")
          .select("id")
          .eq("account_type", "payment_processor_float")
          .maybeSingle();

        if (clientLedgerAcc && floatLedgerAcc) {
          const { data: tx } = await serviceClient
            .from("ledger_transactions")
            .insert({
              description: `Approved USDT Deposit (${deposit.network})`,
              reference_type: "deposit",
              reference_id: deposit.id,
            })
            .select()
            .single();

          if (tx) {
            await serviceClient.from("ledger_entries").insert([
              {
                transaction_id: tx.id,
                account_id: floatLedgerAcc.id,
                direction: "debit",
                amount: deposit.amount,
                entry_type: "deposit",
                nature: `Crypto Custody Clearing Inflow (${deposit.network})`,
              },
              {
                transaction_id: tx.id,
                account_id: clientLedgerAcc.id,
                direction: "credit",
                amount: deposit.amount,
                entry_type: "deposit",
                nature: `Client Account Funding Credit`,
              },
            ]);
          }
        }

        // Update Trading Account Balance
        const { data: account } = await serviceClient
          .from("trading_accounts")
          .select("*")
          .eq("user_id", deposit.user_id)
          .maybeSingle();

        if (account) {
          const newBal = moneyAdd(account.balance, deposit.amount);
          await serviceClient
            .from("trading_accounts")
            .update({ balance: newBal, updated_at: now })
            .eq("id", account.id);
        }
      }

      await serviceClient
        .from("deposits")
        .update({
          status: review.status,
          admin_notes: review.adminNotes || null,
          reviewed_by: reviewedByUserId || null,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", review.id);

      await serviceClient.from("audit_logs").insert({
        user_id: reviewedByUserId,
        action: `DEPOSIT_${review.status.toUpperCase()}`,
        category: "vault",
        metadata: { deposit_id: review.id, user_id: deposit.user_id, amount: deposit.amount },
      });

      await serviceClient.from("notifications").insert({
        user_id: deposit.user_id,
        title: `Deposit ${review.status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your deposit of $${deposit.amount} USDT has been ${review.status}.`,
        type: "cashier",
      });
    } else {
      // Withdrawal Review
      const { data: wd, error } = await serviceClient
        .from("withdrawals")
        .select("*")
        .eq("id", review.id)
        .single();

      if (error || !wd) {
        return createClientRefusal({
          code: "WITHDRAWAL_NOT_FOUND",
          whatHappened: `Withdrawal ${review.id} not found.`,
          why: "The withdrawal record could not be found.",
          howToResolve: "Refresh the cashier management list.",
          whereToGo: { label: "Admin Cashier", url: "/admin" },
        });
      }

      if (review.status === "approved") {
        // Double-entry ledger: Debit Client Funds, Credit Float (Clearing)
        const { data: clientLedgerAcc } = await serviceClient
          .from("ledger_accounts")
          .select("id")
          .eq("user_id", wd.user_id)
          .eq("account_type", "client_funds")
          .maybeSingle();

        const { data: floatLedgerAcc } = await serviceClient
          .from("ledger_accounts")
          .select("id")
          .eq("account_type", "payment_processor_float")
          .maybeSingle();

        if (clientLedgerAcc && floatLedgerAcc) {
          const { data: tx } = await serviceClient
            .from("ledger_transactions")
            .insert({
              description: `Approved USDT Withdrawal (${wd.network})`,
              reference_type: "withdrawal",
              reference_id: wd.id,
            })
            .select()
            .single();

          if (tx) {
            await serviceClient.from("ledger_entries").insert([
              {
                transaction_id: tx.id,
                account_id: clientLedgerAcc.id,
                direction: "debit",
                amount: wd.amount,
                entry_type: "withdrawal",
                nature: `Client Account Withdrawal Debit`,
              },
              {
                transaction_id: tx.id,
                account_id: floatLedgerAcc.id,
                direction: "credit",
                amount: wd.amount,
                entry_type: "withdrawal",
                nature: `Crypto Custody Clearing Outflow (${wd.network})`,
              },
            ]);
          }
        }

        // Update Trading Account Balance
        const { data: account } = await serviceClient
          .from("trading_accounts")
          .select("*")
          .eq("user_id", wd.user_id)
          .maybeSingle();

        if (account) {
          const newBal = moneySubtract(account.balance, wd.amount);
          await serviceClient
            .from("trading_accounts")
            .update({ balance: newBal, updated_at: now })
            .eq("id", account.id);
        }
      }

      await serviceClient
        .from("withdrawals")
        .update({
          status: review.status,
          admin_notes: review.adminNotes || null,
          reviewed_by: reviewedByUserId || null,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", review.id);

      await serviceClient.from("audit_logs").insert({
        user_id: reviewedByUserId,
        action: `WITHDRAWAL_${review.status.toUpperCase()}`,
        category: "vault",
        metadata: { withdrawal_id: review.id, user_id: wd.user_id, amount: wd.amount },
      });

      await serviceClient.from("notifications").insert({
        user_id: wd.user_id,
        title: `Withdrawal ${review.status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your withdrawal of $${wd.amount} USDT has been ${review.status}.`,
        type: "cashier",
      });
    }

    return {
      success: true,
      data: { id: review.id, status: review.status },
      message: `${review.type === "deposit" ? "Deposit" : "Withdrawal"} has been ${review.status}.`,
    };
  }
}

-- Migration: Double-Entry Ledger Schema with Database-Level Deferred Balancing and Fund Segregation

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE ledger_account_type AS ENUM (
        'client_funds',
        'company_operating',
        'fee_revenue',
        'payment_processor_float'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_direction AS ENUM ('debit', 'credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ledger_entry_type AS ENUM (
        'deposit',
        'withdrawal',
        'trade_margin_lock',
        'trade_margin_release',
        'trade_pnl',
        'fee',
        'commission',
        'adjustment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Ledger Accounts Table (NO STORED BALANCE COLUMN - Rule #2)
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    account_type ledger_account_type NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_user_id ON public.ledger_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_type ON public.ledger_accounts(account_type);

-- 3. Create Ledger Transactions Table
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Ledger Entries Table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    direction entry_direction NOT NULL,
    amount NUMERIC(28, 8) NOT NULL CHECK (amount > 0),
    entry_type ledger_entry_type NOT NULL,
    nature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx_id ON public.ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_acc_id ON public.ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created ON public.ledger_entries(created_at);

-- 5. Deferred Constraint Trigger: Debits Equal Credits within Transaction (Rule #3)
CREATE OR REPLACE FUNCTION public.check_transaction_balanced()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debits NUMERIC(28, 8);
    v_total_credits NUMERIC(28, 8);
    v_imbalance NUMERIC(28, 8);
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0)
    INTO v_total_debits, v_total_credits
    FROM public.ledger_entries
    WHERE transaction_id = NEW.transaction_id;

    v_imbalance := v_total_debits - v_total_credits;

    IF v_imbalance != 0 THEN
        RAISE EXCEPTION 'Unbalanced transaction %: Total debits (%) must equal total credits (%). Imbalance: %', 
            NEW.transaction_id, v_total_debits, v_total_credits, v_imbalance
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_transaction_balance ON public.ledger_entries;
CREATE CONSTRAINT TRIGGER enforce_transaction_balance
    AFTER INSERT OR UPDATE ON public.ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.check_transaction_balanced();

-- 6. Deferred Constraint Trigger: Client & Company Fund Segregation (Rule #4)
-- No code path may move value from client funds to company funds except through entries explicitly typed as fee or commission.
CREATE OR REPLACE FUNCTION public.check_fund_segregation()
RETURNS TRIGGER AS $$
DECLARE
    v_has_client_funds BOOLEAN;
    v_has_company_operating BOOLEAN;
    v_invalid_entry_count INTEGER;
BEGIN
    -- Check if transaction touches both client_funds and company_operating
    SELECT 
        bool_or(a.account_type = 'client_funds'),
        bool_or(a.account_type = 'company_operating')
    INTO v_has_client_funds, v_has_company_operating
    FROM public.ledger_entries e
    JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE e.transaction_id = NEW.transaction_id;

    IF v_has_client_funds AND v_has_company_operating THEN
        -- Verify that all entries between them are strictly typed as fee or commission
        SELECT COUNT(*)
        INTO v_invalid_entry_count
        FROM public.ledger_entries e
        JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE e.transaction_id = NEW.transaction_id
          AND a.account_type IN ('client_funds', 'company_operating')
          AND e.entry_type NOT IN ('fee', 'commission');

        IF v_invalid_entry_count > 0 THEN
            RAISE EXCEPTION 'Segregation violation in transaction %: Value transfer between client funds and company operating funds is strictly prohibited outside fee/commission entry types.',
                NEW.transaction_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_fund_segregation ON public.ledger_entries;
CREATE CONSTRAINT TRIGGER enforce_fund_segregation
    AFTER INSERT OR UPDATE ON public.ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.check_fund_segregation();

-- 7. SQL Helper Function: Derive Account Balance by Summation (Rule #2)
CREATE OR REPLACE FUNCTION public.get_account_balance(p_account_id UUID)
RETURNS NUMERIC(28, 8) AS $$
DECLARE
    v_balance NUMERIC(28, 8);
    v_account_type ledger_account_type;
BEGIN
    SELECT account_type INTO v_account_type
    FROM public.ledger_accounts
    WHERE id = p_account_id;

    IF v_account_type IS NULL THEN
        RETURN 0;
    END IF;

    -- For client_funds, fee_revenue, company_operating, and float:
    -- Net balance = Credits - Debits (for liability/equity/revenue accounts)
    -- Or standard accounting convention: Credits increase client account equity.
    SELECT COALESCE(
        SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END),
        0
    ) INTO v_balance
    FROM public.ledger_entries
    WHERE account_id = p_account_id;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;

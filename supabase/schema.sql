-- ==============================================================================
-- MARKET MAKER COMPLETE PRODUCTION DATABASE SCHEMA
-- Execute this script in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'admin', 'operations', 'compliance', 'finance', 'dealer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kyc_status AS ENUM ('unverified', 'pending_verification', 'verified', 'restricted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    country TEXT NOT NULL DEFAULT 'United Kingdom',
    role user_role NOT NULL DEFAULT 'client',
    kyc_status kyc_status NOT NULL DEFAULT 'unverified',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Ledger Accounts Table (No Mutable Balance Column)
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

-- 4. Create Ledger Transactions Table
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create Ledger Entries Table
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

-- 6. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 7. Deferred Constraint Trigger: Debits Equal Credits within Transaction
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

-- 8. Deferred Constraint Trigger: Client & Company Fund Segregation
CREATE OR REPLACE FUNCTION public.check_fund_segregation()
RETURNS TRIGGER AS $$
DECLARE
    v_has_client_funds BOOLEAN;
    v_has_company_operating BOOLEAN;
    v_invalid_entry_count INTEGER;
BEGIN
    SELECT 
        bool_or(a.account_type = 'client_funds'),
        bool_or(a.account_type = 'company_operating')
    INTO v_has_client_funds, v_has_company_operating
    FROM public.ledger_entries e
    JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE e.transaction_id = NEW.transaction_id;

    IF v_has_client_funds AND v_has_company_operating THEN
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

-- 9. SQL Balance Derivation Helper
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

    SELECT COALESCE(
        SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END),
        0
    ) INTO v_balance
    FROM public.ledger_entries
    WHERE account_id = p_account_id;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Allow authenticated and anon reads/writes for testing
DO $$ BEGIN
    CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE USING (true);

    CREATE POLICY "Allow public read on ledger_accounts" ON public.ledger_accounts FOR SELECT USING (true);
    CREATE POLICY "Allow public insert on ledger_accounts" ON public.ledger_accounts FOR INSERT WITH CHECK (true);

    CREATE POLICY "Allow public read on ledger_transactions" ON public.ledger_transactions FOR SELECT USING (true);
    CREATE POLICY "Allow public insert on ledger_transactions" ON public.ledger_transactions FOR INSERT WITH CHECK (true);

    CREATE POLICY "Allow public read on ledger_entries" ON public.ledger_entries FOR SELECT USING (true);
    CREATE POLICY "Allow public insert on ledger_entries" ON public.ledger_entries FOR INSERT WITH CHECK (true);

    CREATE POLICY "Allow public read on audit_logs" ON public.audit_logs FOR SELECT USING (true);
    CREATE POLICY "Allow public insert on audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

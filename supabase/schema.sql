-- ==============================================================================
-- MARKET MAKER COMPLETE PRODUCTION DATABASE SCHEMA (CONSOLIDATED)
-- Execute this script in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Create Base Enums
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

DO $$ BEGIN
    CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_type AS ENUM ('MARKET', 'LIMIT', 'STOP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'PENDING',
        'OPEN',
        'FILLED',
        'PARTIALLY_FILLED',
        'CANCELLED',
        'REJECTED',
        'EXPIRED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE position_status AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE position_close_reason AS ENUM ('MANUAL', 'TAKE_PROFIT', 'STOP_LOSS', 'STOP_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'read_only');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE deposit_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
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

-- 3. Trading Accounts Table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL DEFAULT 'standard',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    leverage INT NOT NULL DEFAULT 100 CHECK (leverage > 0 AND leverage <= 1000),
    balance NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    equity NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    margin NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    free_margin NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    margin_level NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_status ON public.trading_accounts(status);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_number ON public.trading_accounts(account_number);

-- 4. Instruments Table
CREATE TABLE IF NOT EXISTS public.instruments (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    contract_size NUMERIC(28, 8) NOT NULL DEFAULT 100.00,
    min_lot NUMERIC(28, 8) NOT NULL DEFAULT 0.01,
    max_lot NUMERIC(28, 8) NOT NULL DEFAULT 100.00,
    lot_step NUMERIC(28, 8) NOT NULL DEFAULT 0.01,
    commission_per_lot NUMERIC(28, 8) NOT NULL DEFAULT 15.00,
    spread_markup_pips NUMERIC(28, 8) NOT NULL DEFAULT 25.00,
    max_leverage INT NOT NULL DEFAULT 500,
    is_trading_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.instruments (symbol, name, base_currency, quote_currency, contract_size, min_lot, max_lot, lot_step, commission_per_lot, spread_markup_pips, max_leverage, is_trading_enabled)
VALUES
    ('XAU/USD', 'Gold / US Dollar', 'XAU', 'USD', 100.00, 0.01, 100.00, 0.01, 15.00, 25.00, 500, true),
    ('EUR/USD', 'Euro / US Dollar', 'EUR', 'USD', 100000.00, 0.01, 50.00, 0.01, 7.00, 15.00, 500, true),
    ('BTC/USD', 'Bitcoin / US Dollar', 'BTC', 'USD', 1.00, 0.01, 20.00, 0.01, 20.00, 50.00, 100, true),
    ('ETH/USD', 'Ethereum / US Dollar', 'ETH', 'USD', 10.00, 0.01, 50.00, 0.01, 15.00, 40.00, 100, true),
    ('XAG/USD', 'Silver / US Dollar', 'XAG', 'USD', 5000.00, 0.01, 50.00, 0.01, 15.00, 30.00, 200, true)
ON CONFLICT (symbol) DO NOTHING;

-- 5. Ledger Accounts Table
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

-- 6. Ledger Transactions Table
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Ledger Entries Table
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

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES public.instruments(symbol),
    side order_side NOT NULL,
    order_type order_type NOT NULL,
    volume NUMERIC(28, 8) NOT NULL CHECK (volume > 0),
    requested_price NUMERIC(28, 8),
    executed_price NUMERIC(28, 8),
    stop_loss NUMERIC(28, 8),
    take_profit NUMERIC(28, 8),
    status order_status NOT NULL DEFAULT 'PENDING',
    commission NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    swap NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_account_id ON public.orders(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON public.orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 9. Positions Table
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL REFERENCES public.instruments(symbol),
    side order_side NOT NULL,
    volume NUMERIC(28, 8) NOT NULL CHECK (volume > 0),
    open_price NUMERIC(28, 8) NOT NULL CHECK (open_price > 0),
    current_price NUMERIC(28, 8) NOT NULL CHECK (current_price > 0),
    stop_loss NUMERIC(28, 8),
    take_profit NUMERIC(28, 8),
    margin NUMERIC(28, 8) NOT NULL CHECK (margin >= 0),
    leverage INT NOT NULL DEFAULT 100,
    floating_pnl NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    realized_pnl NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    commission NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    swap NUMERIC(28, 8) NOT NULL DEFAULT 0.00,
    status position_status NOT NULL DEFAULT 'OPEN',
    close_price NUMERIC(28, 8),
    close_reason position_close_reason,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    ledger_transaction_id UUID REFERENCES public.ledger_transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_positions_account_id ON public.positions(account_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON public.positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_status ON public.positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON public.positions(opened_at DESC);

-- 10. Deposits Table
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    amount NUMERIC(28, 8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    network TEXT NOT NULL DEFAULT 'TRC20',
    deposit_address TEXT NOT NULL,
    tx_hash TEXT,
    status deposit_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_account_id ON public.deposits(account_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);

-- 11. Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    amount NUMERIC(28, 8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    network TEXT NOT NULL DEFAULT 'TRC20',
    destination_address TEXT NOT NULL,
    tx_hash TEXT,
    status withdrawal_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_account_id ON public.withdrawals(account_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- 12. Risk Settings Table
CREATE TABLE IF NOT EXISTS public.risk_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    margin_call_level NUMERIC(28, 8) NOT NULL DEFAULT 100.00,
    stop_out_level NUMERIC(28, 8) NOT NULL DEFAULT 50.00,
    max_open_positions INT NOT NULL DEFAULT 50,
    max_account_exposure NUMERIC(28, 8) NOT NULL DEFAULT 1000.00,
    max_daily_loss NUMERIC(28, 8) NOT NULL DEFAULT 50000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- 14. Audit Logs Table
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 15. Deferred Constraint Triggers for Ledger Balancing & Segregation
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

-- 16. SQL Helper Function: Derive Account Balance
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

-- 17. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

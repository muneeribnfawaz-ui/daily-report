-- 1. Create Same-Day and Immutable Signatures Trigger Function
CREATE OR REPLACE FUNCTION finance_edit_guard() RETURNS TRIGGER AS $$
BEGIN
  -- We allow updates if it's a soft-delete (isDeleted going from false to true is sometimes necessary, though we can block it if needed).
  -- But for this task, the primary concern is the `amount` and historical data.
  
  -- Same-Day Lock Check
  IF (OLD."createdAt" AT TIME ZONE 'Asia/Kolkata')::DATE != (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE THEN
      RAISE EXCEPTION 'Historical financial records cannot be modified after midnight.';
  END IF;

  -- Ensure row_signature is modified during an update (meaning the backend re-signed it).
  IF OLD.row_signature = NEW.row_signature AND NEW.row_signature != '' THEN
      RAISE EXCEPTION 'Unauthorized direct database modification detected. Signature mismatch.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply triggers to Transaction table
DROP TRIGGER IF EXISTS finance_transaction_guard ON "Transaction";
CREATE TRIGGER finance_transaction_guard
BEFORE UPDATE ON "Transaction"
FOR EACH ROW EXECUTE FUNCTION finance_edit_guard();

-- Apply triggers to BankAccount table
DROP TRIGGER IF EXISTS finance_bank_account_guard ON "BankAccount";
CREATE TRIGGER finance_bank_account_guard
BEFORE UPDATE ON "BankAccount"
FOR EACH ROW EXECUTE FUNCTION finance_edit_guard();

-- Apply triggers to PettyCash table
DROP TRIGGER IF EXISTS finance_petty_cash_guard ON "PettyCash";
CREATE TRIGGER finance_petty_cash_guard
BEFORE UPDATE ON "PettyCash"
FOR EACH ROW EXECUTE FUNCTION finance_edit_guard();


-- 3. Role-Based Access Control (RBAC)

-- Note: In a real system you'd drop/create these carefully, but we use DO blocks or ignore errors if roles exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'finance_app_user') THEN
        CREATE ROLE finance_app_user LOGIN PASSWORD 'secure_password';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'db_readonly') THEN
        CREATE ROLE db_readonly LOGIN PASSWORD 'readonly_password';
    END IF;
END
$$;

-- Grant strict privileges for app user
GRANT USAGE ON SCHEMA public TO finance_app_user;
GRANT SELECT, INSERT, UPDATE ON "Transaction", "BankAccount", "PettyCash", "TransactionAuditLog" TO finance_app_user;
REVOKE DELETE ON "Transaction", "BankAccount", "PettyCash" FROM finance_app_user;

-- Grant read-only for developers/analytics
GRANT USAGE ON SCHEMA public TO db_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO db_readonly;

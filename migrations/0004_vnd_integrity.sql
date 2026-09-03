-- Ledger integrity backstop.
--
-- Settlement in engine.server.ts debits with a conditional update
-- (`where balance >= amount`), so the balance test and the write are one
-- statement and two concurrent settlements cannot both overdraw an account.
-- This constraint is the database-level guarantee behind that: even a future
-- code path that forgets the condition cannot push an account negative.
--
-- Credits are unconstrained; only the floor is enforced.
alter table vnd_accounts drop constraint if exists vnd_accounts_balance_nonneg;
alter table vnd_accounts add constraint vnd_accounts_balance_nonneg check (balance >= 0);

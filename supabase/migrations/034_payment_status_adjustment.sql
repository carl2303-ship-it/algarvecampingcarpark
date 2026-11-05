-- Allow ledger rows for date-change charges (early arrival / similar) that are not money received.
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'adjustment';

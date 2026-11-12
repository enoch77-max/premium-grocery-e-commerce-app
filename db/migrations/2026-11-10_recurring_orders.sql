-- Recurring grocery orders — schema migration
-- Apply with: psql "$DATABASE_URL" -f db/migrations/2026-11-10_recurring_orders.sql
-- Idempotent: safe to run on an existing database.

CREATE TABLE IF NOT EXISTS payment_methods (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  gateway text NOT NULL DEFAULT 'stripe',
  gateway_customer_token text NOT NULL,
  gateway_payment_method_token text NOT NULL,
  brand text NOT NULL DEFAULT 'card',
  last4 text NOT NULL DEFAULT '',
  exp_month integer,
  exp_year integer,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_methods_user_idx ON payment_methods (user_id);
DO $$ BEGIN
  ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_token_unique
    UNIQUE (gateway, gateway_payment_method_token);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS recurring_lists (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  cadence text NOT NULL,
  local_time text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  anchor_day integer,
  anchor_weekday integer,
  shortage_policy text NOT NULL DEFAULT 'partial',
  payment_method_id integer NOT NULL,
  consent_at timestamptz NOT NULL,
  consent_version text NOT NULL DEFAULT '2026-01',
  consent_ip text NOT NULL DEFAULT '',
  lead_time_hours integer NOT NULL DEFAULT 24,
  skip_next_at timestamptz,
  delay_until timestamptz,
  paused_reason text,
  next_run_at timestamptz,
  last_run_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  completed_runs integer NOT NULL DEFAULT 0,
  skip_count integer NOT NULL DEFAULT 0,
  address_label text NOT NULL DEFAULT 'Home',
  address_line1 text NOT NULL DEFAULT '',
  address_city text NOT NULL DEFAULT '',
  address_postcode text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recurring_lists_user_idx ON recurring_lists (user_id);
CREATE INDEX IF NOT EXISTS recurring_lists_due_idx ON recurring_lists (status, next_run_at);

CREATE TABLE IF NOT EXISTS recurring_list_items (
  id serial PRIMARY KEY,
  list_id integer NOT NULL,
  product_id integer NOT NULL,
  quantity integer NOT NULL,
  price_at_creation_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE recurring_list_items ADD CONSTRAINT recurring_list_items_unique
    UNIQUE (list_id, product_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The scheduler's double-run guard.
CREATE TABLE IF NOT EXISTS recurring_runs (
  id serial PRIMARY KEY,
  list_id integer NOT NULL,
  occurrence_key text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'scheduled',
  idempotency_key text NOT NULL UNIQUE,
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  amount_cents integer NOT NULL DEFAULT 0,
  order_id integer,
  order_number text,
  charge_token text,
  failure_code text,
  failure_message text,
  price_changed boolean NOT NULL DEFAULT false,
  priority_score integer NOT NULL DEFAULT 0,
  decision_reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE recurring_runs ADD CONSTRAINT recurring_runs_list_occurrence_unique
    UNIQUE (list_id, occurrence_key);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS recurring_runs_state_idx ON recurring_runs (state);

CREATE TABLE IF NOT EXISTS recurring_run_events (
  id serial PRIMARY KEY,
  run_id integer,
  list_id integer NOT NULL,
  from_state text,
  to_state text NOT NULL,
  reason text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT 'scheduler',
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recurring_run_events_list_idx ON recurring_run_events (list_id);

CREATE TABLE IF NOT EXISTS stock_reservations (
  id serial PRIMARY KEY,
  run_id integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_reservations_run_idx ON stock_reservations (run_id);

CREATE TABLE IF NOT EXISTS stock_reservation_items (
  id serial PRIMARY KEY,
  reservation_id integer NOT NULL,
  product_id integer NOT NULL,
  quantity integer NOT NULL,
  requested_quantity integer NOT NULL,
  unit_price_cents integer NOT NULL
);
CREATE INDEX IF NOT EXISTS stock_reservation_items_res_idx ON stock_reservation_items (reservation_id);

CREATE TABLE IF NOT EXISTS notification_events (
  id serial PRIMARY KEY,
  user_id integer,
  list_id integer,
  run_id integer,
  type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  title text NOT NULL,
  body text NOT NULL,
  payload text NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_events_user_idx ON notification_events (user_id);

-- Idempotent order creation for recurring runs (orders.checkout_id is unique).
INSERT INTO orders (order_number, checkout_id, user_id, customer_name, email, phone, address, city, postcode,
                    delivery_slot, payment_method, notes, subtotal_cents, savings_cents, delivery_cents,
                    discount_cents, total_cents, item_count, status)
SELECT 'noop', 'recurring:noop', NULL, 'noop', 'noop@example.com', '', '-', '-', '-',
       'recurring', 'card', '', 0, 0, 0, 0, 0, 0, 'cancelled'
WHERE false;

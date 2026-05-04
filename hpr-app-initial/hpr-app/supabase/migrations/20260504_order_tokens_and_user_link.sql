-- Add secure token for magic-link order access (guest and authenticated)
-- Add user_id to link orders to accounts (nullable for guest checkouts)
-- Add carrier and shipped_at for shipping confirmation emails

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

-- Index for token lookups (magic links)
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(order_token) WHERE order_token IS NOT NULL;

-- Index for user order history
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;

-- Index for customer email lookups (guest order history / account claim)
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

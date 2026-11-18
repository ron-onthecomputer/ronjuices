ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_currency_check;

ALTER TABLE products
  ALTER COLUMN currency SET DEFAULT 'USD';

UPDATE products
SET currency = 'USD'
WHERE currency = 'ZAR';

ALTER TABLE products
  ADD CONSTRAINT products_currency_check
  CHECK (currency IN ('USD', 'ZWG'));

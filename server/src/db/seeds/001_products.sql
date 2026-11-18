INSERT INTO products (
  slug, name, description, volume_ml, price_cents, currency,
  stock_quantity, low_stock_threshold, is_active, is_featured,
  accent_color, background_color
) VALUES
  ('cranberry', 'CRANBERRY BLAST', 'Tart, refreshing, antioxidant-rich', 500, 700, 'USD', 20, 5, TRUE, TRUE, '#960006', '#960006'),
  ('blueberry', 'BLUEBERRY BURST', 'Sweet blues packed with energy', 500, 600, 'USD', 20, 5, TRUE, FALSE, '#284095', '#284095'),
  ('kiwi', 'KIWI ZEST', 'Bright, tangy, tropical vibes', 500, 600, 'USD', 20, 5, TRUE, FALSE, '#90B701', '#90B701'),
  ('watermelon', 'WATERMELON SQUASH', 'Citrus-forward, naturally energizing', 500, 500, 'USD', 20, 5, TRUE, FALSE, '#E7383B', '#E7383B'),
  ('mango', 'MANGO RUSH', 'Silky-sweet tropical goodness', 500, 500, 'USD', 20, 5, TRUE, FALSE, '#FFA500', '#FFA500'),
  ('grape', 'GRAPE GLIDE', 'Smooth, juicy, satisfying finish', 500, 500, 'USD', 20, 5, TRUE, FALSE, '#3E0162', '#3E0162')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  volume_ml = EXCLUDED.volume_ml,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  accent_color = EXCLUDED.accent_color,
  background_color = EXCLUDED.background_color;

INSERT INTO product_images (
  product_id, alt_text, fallback_url, webp_url, avif_url, width, height, sort_order
)
SELECT
  p.id,
  p.name || ' 500ml can',
  image.fallback_url,
  image.webp_url,
  image.avif_url,
  800,
  533,
  0
FROM products p
JOIN (VALUES
  ('cranberry', '/images/cranberryCan.png', '/images/optimized/cranberryCan-800.webp', '/images/optimized/cranberryCan-800.avif'),
  ('blueberry', '/images/blueberryCan.png', '/images/optimized/blueberryCan-800.webp', '/images/optimized/blueberryCan-800.avif'),
  ('kiwi', '/images/kiwi.png', '/images/optimized/kiwi-800.webp', '/images/optimized/kiwi-800.avif'),
  ('watermelon', '/images/watermelon.png', '/images/optimized/watermelon-800.webp', '/images/optimized/watermelon-800.avif'),
  ('mango', '/images/mangoCan.png', '/images/optimized/mangoCan-800.webp', '/images/optimized/mangoCan-800.avif'),
  ('grape', '/images/grapeCan.png', '/images/optimized/grapeCan-800.webp', '/images/optimized/grapeCan-800.avif')
) AS image(slug, fallback_url, webp_url, avif_url) ON image.slug = p.slug
ON CONFLICT (product_id, sort_order) DO UPDATE SET
  alt_text = EXCLUDED.alt_text,
  fallback_url = EXCLUDED.fallback_url,
  webp_url = EXCLUDED.webp_url,
  avif_url = EXCLUDED.avif_url,
  width = EXCLUDED.width,
  height = EXCLUDED.height;

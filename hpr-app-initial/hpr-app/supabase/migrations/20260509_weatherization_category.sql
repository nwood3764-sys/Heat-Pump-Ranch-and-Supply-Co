-- =========================================================================
-- The Heat Pump Ranch & Supply Co. — Migration: Weatherization Category
-- Adds 'weatherization' to the product_type enum and creates the
-- Weatherization Materials / Cellulose Insulation category hierarchy.
--
-- Products will be inserted via a future sync or manual load once
-- dealer pricing is established.
-- =========================================================================

-- =========================================================================
-- 1. Extend product_type enum to include 'weatherization'
-- =========================================================================
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'weatherization';

-- =========================================================================
-- 2. Create the Weatherization Materials parent category
-- =========================================================================
INSERT INTO categories (name, slug, parent_id, description, sort_order)
VALUES (
  'Weatherization Materials',
  'weatherization',
  NULL,
  'Insulation and weatherization products for energy efficiency and comfort.',
  100
)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 3. Create the Cellulose Insulation sub-category
-- =========================================================================
INSERT INTO categories (name, slug, parent_id, description, sort_order)
SELECT
  'Cellulose Insulation',
  'cellulose-insulation',
  c.id,
  'Blow-in, spray-applied, and dense-pack cellulose insulation from Green Fiber.',
  10
FROM categories c
WHERE c.slug = 'weatherization'
ON CONFLICT DO NOTHING;

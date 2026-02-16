-- Add dedicated EAN column to Product master
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "ean" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_ean_key"
  ON "Product"("ean");

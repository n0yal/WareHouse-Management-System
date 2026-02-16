-- WMS Inventory Upgrade
-- 1) Add new WMS columns and entities
-- 2) Backfill from legacy columns
-- 3) Replace old uniqueness with WMS composite uniqueness
-- 4) Keep legacy columns for compatibility until full app cutover

-- Product enhancements
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "trackingType" TEXT NOT NULL DEFAULT 'none';

-- Location enhancements
ALTER TABLE "Location"
  ADD COLUMN IF NOT EXISTS "locationType" TEXT NOT NULL DEFAULT 'storage',
  ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- Inventory enhancements
ALTER TABLE "Inventory"
  ADD COLUMN IF NOT EXISTS "lotNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onHandQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "allocatedQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "holdQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "damagedQty" INTEGER NOT NULL DEFAULT 0;

-- Backfill new quantity fields from legacy quantity
UPDATE "Inventory"
SET "onHandQty" = COALESCE("quantity", 0)
WHERE "onHandQty" = 0;

-- Make updatedBy nullable for system workflows
ALTER TABLE "Inventory"
  ALTER COLUMN "updatedBy" DROP NOT NULL;

-- Inventory movement ledger
CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "locationId" TEXT,
  "lotNumber" TEXT,
  "serialNumber" TEXT,
  "txnType" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "reason" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "InventoryTransaction_productId_createdAt_idx"
  ON "InventoryTransaction"("productId", "createdAt");

CREATE INDEX IF NOT EXISTS "InventoryTransaction_referenceType_referenceId_idx"
  ON "InventoryTransaction"("referenceType", "referenceId");

-- Drop legacy one-to-one uniqueness to allow multi-bin SKU and multi-SKU bin
DROP INDEX IF EXISTS "Inventory_productId_key";
DROP INDEX IF EXISTS "Inventory_locationId_key";

-- Add WMS indexes and composite uniqueness
CREATE INDEX IF NOT EXISTS "Inventory_productId_idx" ON "Inventory"("productId");
CREATE INDEX IF NOT EXISTS "Inventory_locationId_idx" ON "Inventory"("locationId");
CREATE INDEX IF NOT EXISTS "Inventory_expiryDate_idx" ON "Inventory"("expiryDate");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_balance_key"
  ON "Inventory"("productId", "locationId", "lotNumber", "serialNumber");

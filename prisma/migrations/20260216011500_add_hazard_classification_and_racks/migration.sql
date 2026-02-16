-- Add hazard classification + rack-based putaway support
ALTER TABLE "Inventory"
  ADD COLUMN IF NOT EXISTS "classification" TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "rackLocation" TEXT;

CREATE INDEX IF NOT EXISTS "Inventory_classification_idx" ON "Inventory"("classification");
CREATE INDEX IF NOT EXISTS "Inventory_rackLocation_idx" ON "Inventory"("rackLocation");

CREATE TABLE IF NOT EXISTS "Rack" (
  "id" TEXT NOT NULL,
  "rackCode" TEXT NOT NULL,
  "zoneType" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "currentLoad" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Rack_rackCode_key" ON "Rack"("rackCode");

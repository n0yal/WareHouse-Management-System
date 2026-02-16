/*
  Warnings:

  - You are about to drop the column `lastUpdated` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "lastUpdated",
DROP COLUMN "quantity",
DROP COLUMN "status";

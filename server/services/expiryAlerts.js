"use strict";

const db = require("../db").default || require("../db");

const DAY_MS = 24 * 60 * 60 * 1000;

function getStartOfDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseExpiryDateInput(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid expiryDate");
    }
    return value;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid expiryDate");
  }

  return parsed;
}

function evaluateExpiryStatus(expiryDateValue, now = new Date(), warningDays = 30) {
  const expiryDate = expiryDateValue instanceof Date ? expiryDateValue : new Date(expiryDateValue);
  if (Number.isNaN(expiryDate.getTime())) {
    return null;
  }

  const todayStart = getStartOfDay(now);
  const expiryDayStart = getStartOfDay(expiryDate);
  const daysUntilExpiry = Math.round((expiryDayStart.getTime() - todayStart.getTime()) / DAY_MS);
  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = !isExpired && daysUntilExpiry <= warningDays;

  return {
    expiryDate,
    daysUntilExpiry,
    isExpired,
    isExpiringSoon,
    status: isExpired ? "EXPIRED" : (isExpiringSoon ? "EXPIRING_SOON" : "SAFE"),
  };
}

function toExpiryAlert(item, now = new Date(), warningDays = 30) {
  const evaluation = evaluateExpiryStatus(item.expiryDate, now, warningDays);
  if (!evaluation || (!evaluation.isExpired && !evaluation.isExpiringSoon)) {
    return null;
  }

  return {
    id: item.id,
    productId: item.productId,
    productName: item.product?.name || "Unknown",
    productSku: item.product?.sku || "-",
    lotNumber: item.lotNumber || "-",
    serialNumber: item.serialNumber || "-",
    expiryDate: item.expiryDate,
    daysUntilExpiry: evaluation.daysUntilExpiry,
    status: evaluation.status,
    quantity: item.onHandQty,
    location: item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.rack}` : "-",
    rackLocation: item.rackLocation || "-",
  };
}

async function fetchExpiryAlerts({ warningDays = 30, now = new Date(), prisma = db } = {}) {
  const inventoryItems = await prisma.inventory.findMany({
    where: {
      expiryDate: { not: null },
      onHandQty: { gt: 0 },
    },
    include: { product: true, location: true },
  });

  return inventoryItems
    .map((item) => toExpiryAlert(item, now, warningDays))
    .filter(Boolean)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

module.exports = {
  DAY_MS,
  getStartOfDay,
  parseExpiryDateInput,
  evaluateExpiryStatus,
  toExpiryAlert,
  fetchExpiryAlerts,
};

/**
 * ============================================================
 *  SmartwareERP — UNIT TESTS
 *  Tests individual functions and utilities in isolation
 * ============================================================
 */

const {
  parseExpiryDateInput,
  evaluateExpiryStatus,
} = require('../server/services/expiryAlerts');

// ---- Helper functions extracted from inventory.js for testability ----

const VALID_CLASSES = ['INFLAMMABLE', 'TOXIC', 'FRAGILE', 'NORMAL'];

/** Normalize hazard classification to uppercase canonical form */
function normalizeClassification(raw) {
  if (!raw) return 'NORMAL';
  const upper = String(raw).trim().toUpperCase();
  return VALID_CLASSES.includes(upper) ? upper : 'NORMAL';
}

/** Determine legacy status from inventory record */
function getLegacyStatus(record) {
  if (!record) return 'unknown';
  if (record.onHandQty <= 0) return 'SHIPPED';
  if (record.rackLocation) return 'STORED';
  return 'RECEIVED';
}

/** Calculate available quantity */
function getAvailableQty(record) {
  const onHand = record.onHandQty || 0;
  const allocated = record.allocatedQty || 0;
  const hold = record.holdQty || 0;
  const damaged = record.damagedQty || 0;
  return Math.max(0, onHand - allocated - hold - damaged);
}

/** Validate zone type compatibility for putaway */
function isZoneCompatible(itemClassification, rackZoneType) {
  return normalizeClassification(itemClassification) === normalizeClassification(rackZoneType);
}

/** Check if rack has capacity */
function hasRackCapacity(rack, qty) {
  return (rack.currentLoad + qty) <= rack.capacity;
}

/** Validate SKU format (alphanumeric, 3-50 chars) */
function isValidSku(sku) {
  return /^[A-Za-z0-9\-_]{3,50}$/.test(sku);
}

/** Parse and validate price */
function parsePrice(value) {
  const price = parseFloat(value);
  return isNaN(price) || price < 0 ? null : Math.round(price * 100) / 100;
}

/** Extract classification from AI response text */
function extractClassification(value) {
  const text = String(value || '').trim().toUpperCase();
  const matched = text.match(/\b(INFLAMMABLE|TOXIC|FRAGILE|NORMAL)\b/);
  if (matched) return normalizeClassification(matched[1]);
  if (text === 'IN' || text.startsWith('INFL')) return 'INFLAMMABLE';
  if (text === 'TO' || text.startsWith('TOX')) return 'TOXIC';
  if (text === 'FR' || text.startsWith('FRA')) return 'FRAGILE';
  if (text === 'NO' || text.startsWith('NOR')) return 'NORMAL';
  return null;
}


// =============================================
//  TEST SUITE
// =============================================

describe('Unit Tests — SmartwareERP Utilities', () => {

  // ---- 1. Hazard Classification Normalization ----
  describe('normalizeClassification()', () => {
    test('should return INFLAMMABLE for valid input', () => {
      expect(normalizeClassification('INFLAMMABLE')).toBe('INFLAMMABLE');
    });

    test('should return TOXIC for lowercase input', () => {
      expect(normalizeClassification('toxic')).toBe('TOXIC');
    });

    test('should return FRAGILE for mixed case input', () => {
      expect(normalizeClassification('Fragile')).toBe('FRAGILE');
    });

    test('should return NORMAL for null/undefined input', () => {
      expect(normalizeClassification(null)).toBe('NORMAL');
      expect(normalizeClassification(undefined)).toBe('NORMAL');
    });

    test('should return NORMAL for invalid classification', () => {
      expect(normalizeClassification('EXPLOSIVE')).toBe('NORMAL');
      expect(normalizeClassification('')).toBe('NORMAL');
    });

    test('should trim whitespace from input', () => {
      expect(normalizeClassification('  TOXIC  ')).toBe('TOXIC');
    });
  });

  // ---- 2. Legacy Status Derivation ----
  describe('getLegacyStatus()', () => {
    test('should return RECEIVED when no rack location and qty > 0', () => {
      const record = { onHandQty: 10, rackLocation: null };
      expect(getLegacyStatus(record)).toBe('RECEIVED');
    });

    test('should return STORED when rack location assigned', () => {
      const record = { onHandQty: 10, rackLocation: 'RACK-A1' };
      expect(getLegacyStatus(record)).toBe('STORED');
    });

    test('should return SHIPPED when quantity is 0', () => {
      const record = { onHandQty: 0, rackLocation: 'RACK-A1' };
      expect(getLegacyStatus(record)).toBe('SHIPPED');
    });

    test('should return unknown for null record', () => {
      expect(getLegacyStatus(null)).toBe('unknown');
    });
  });

  // ---- 3. Available Quantity Calculation ----
  describe('getAvailableQty()', () => {
    test('should calculate correct available quantity', () => {
      const record = { onHandQty: 100, allocatedQty: 20, holdQty: 10, damagedQty: 5 };
      expect(getAvailableQty(record)).toBe(65);
    });

    test('should return 0 when all stock is allocated', () => {
      const record = { onHandQty: 50, allocatedQty: 50, holdQty: 0, damagedQty: 0 };
      expect(getAvailableQty(record)).toBe(0);
    });

    test('should never return negative quantity', () => {
      const record = { onHandQty: 10, allocatedQty: 20, holdQty: 5, damagedQty: 0 };
      expect(getAvailableQty(record)).toBe(0);
    });

    test('should handle missing fields as 0', () => {
      const record = { onHandQty: 50 };
      expect(getAvailableQty(record)).toBe(50);
    });
  });

  // ---- 4. Zone Compatibility Check ----
  describe('isZoneCompatible()', () => {
    test('should return true when zones match', () => {
      expect(isZoneCompatible('INFLAMMABLE', 'INFLAMMABLE')).toBe(true);
    });

    test('should return true for case-insensitive match', () => {
      expect(isZoneCompatible('toxic', 'TOXIC')).toBe(true);
    });

    test('should return false when zones differ', () => {
      expect(isZoneCompatible('INFLAMMABLE', 'FRAGILE')).toBe(false);
    });

    test('should return false for TOXIC item in NORMAL rack', () => {
      expect(isZoneCompatible('TOXIC', 'NORMAL')).toBe(false);
    });
  });

  // ---- 5. Rack Capacity Check ----
  describe('hasRackCapacity()', () => {
    test('should return true when rack has space', () => {
      const rack = { capacity: 100, currentLoad: 50 };
      expect(hasRackCapacity(rack, 10)).toBe(true);
    });

    test('should return true when rack is exactly filled', () => {
      const rack = { capacity: 100, currentLoad: 90 };
      expect(hasRackCapacity(rack, 10)).toBe(true);
    });

    test('should return false when rack would overflow', () => {
      const rack = { capacity: 100, currentLoad: 95 };
      expect(hasRackCapacity(rack, 10)).toBe(false);
    });
  });

  // ---- 6. SKU Validation ----
  describe('isValidSku()', () => {
    test('should accept valid SKU formats', () => {
      expect(isValidSku('SKU-001')).toBe(true);
      expect(isValidSku('PROD_12345')).toBe(true);
      expect(isValidSku('ABC')).toBe(true);
    });

    test('should reject too short SKU', () => {
      expect(isValidSku('AB')).toBe(false);
    });

    test('should reject SKU with special characters', () => {
      expect(isValidSku('SKU@001')).toBe(false);
      expect(isValidSku('SKU 001')).toBe(false);
    });
  });

  // ---- 7. Price Parsing ----
  describe('parsePrice()', () => {
    test('should parse valid price strings', () => {
      expect(parsePrice('29.99')).toBe(29.99);
      expect(parsePrice('100')).toBe(100);
    });

    test('should round to 2 decimal places', () => {
      expect(parsePrice('19.999')).toBe(20);
    });

    test('should return null for invalid prices', () => {
      expect(parsePrice('abc')).toBeNull();
      expect(parsePrice('-5')).toBeNull();
    });
  });

  // ---- 8. AI Classification Extraction ----
  describe('extractClassification()', () => {
    test('should extract exact classification words', () => {
      expect(extractClassification('INFLAMMABLE')).toBe('INFLAMMABLE');
      expect(extractClassification('TOXIC')).toBe('TOXIC');
      expect(extractClassification('FRAGILE')).toBe('FRAGILE');
      expect(extractClassification('NORMAL')).toBe('NORMAL');
    });

    test('should handle Gemini truncated prefixes', () => {
      expect(extractClassification('IN')).toBe('INFLAMMABLE');
      expect(extractClassification('TO')).toBe('TOXIC');
      expect(extractClassification('FR')).toBe('FRAGILE');
      expect(extractClassification('NO')).toBe('NORMAL');
    });

    test('should extract from sentence context', () => {
      expect(extractClassification('The product is TOXIC')).toBe('TOXIC');
    });

    test('should return null for unrecognized text', () => {
      expect(extractClassification('EXPLOSIVE')).toBeNull();
      expect(extractClassification('')).toBeNull();
    });
  });

  // ---- 8. Expiry Date Handling ----
  describe('parseExpiryDateInput()', () => {
    test('should store date-only expiry values at end of UTC day', () => {
      const parsed = parseExpiryDateInput('2026-03-28');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(2);
      expect(parsed.getDate()).toBe(28);
      expect(parsed.getHours()).toBe(23);
      expect(parsed.getMinutes()).toBe(59);
      expect(parsed.getSeconds()).toBe(59);
    });

    test('should return null for empty expiry input', () => {
      expect(parseExpiryDateInput(null)).toBeNull();
      expect(parseExpiryDateInput('')).toBeNull();
    });

    test('should reject invalid expiry input', () => {
      expect(() => parseExpiryDateInput('not-a-date')).toThrow('Invalid expiryDate');
    });
  });

  describe('evaluateExpiryStatus()', () => {
    test('should treat an item as valid throughout its expiry date', () => {
      const status = evaluateExpiryStatus(
        parseExpiryDateInput('2026-03-28'),
        new Date(2026, 2, 28, 12, 0, 0),
        30,
      );
      expect(status.status).toBe('EXPIRING_SOON');
      expect(status.daysUntilExpiry).toBe(0);
      expect(status.isExpired).toBe(false);
    });

    test('should mark an item expired the next calendar day', () => {
      const status = evaluateExpiryStatus(
        parseExpiryDateInput('2026-03-28'),
        new Date(2026, 2, 29, 0, 0, 0),
        30,
      );
      expect(status.status).toBe('EXPIRED');
      expect(status.daysUntilExpiry).toBeLessThan(0);
      expect(status.isExpired).toBe(true);
    });
  });
});

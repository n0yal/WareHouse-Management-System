"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
const normalizeZoneType = (value) => {
    const normalized = String(value || "NORMAL").trim().toUpperCase();
    return ["INFLAMMABLE", "TOXIC", "FRAGILE", "NORMAL"].includes(normalized)
        ? normalized
        : "NORMAL";
};
router.get('/', async (_req, res) => {
    try {
        const racks = await db_1.default.rack.findMany({ orderBy: { rackCode: 'asc' } });
        res.json(racks);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch racks', detail });
    }
});
router.post('/', async (req, res) => {
    try {
        const { rackCode, zoneType, capacity } = req.body;
        if (!rackCode) {
            return res.status(400).json({ error: 'rackCode is required' });
        }
        const parsedCapacity = parseInt(capacity);
        if (Number.isNaN(parsedCapacity) || parsedCapacity <= 0) {
            return res.status(400).json({ error: 'capacity must be greater than 0' });
        }
        const rack = await db_1.default.rack.create({
            data: {
                rackCode: String(rackCode).trim(),
                zoneType: normalizeZoneType(zoneType),
                capacity: parsedCapacity,
                currentLoad: 0,
            },
        });
        res.status(201).json(rack);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: 'Failed to create rack', detail });
    }
});
exports.default = router;

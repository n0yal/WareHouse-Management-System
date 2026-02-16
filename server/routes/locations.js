"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const locations = await db_1.default.location.findMany({
            include: { inventories: true }
        });
        res.json(locations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const location = await db_1.default.location.findUnique({
            where: { id: req.params.id },
            include: { inventories: true }
        });
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(location);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch location' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, zone, aisle, rack, shelf, capacity, locationType, isBlocked } = req.body;
        const location = await db_1.default.location.create({
            data: {
                name,
                zone,
                aisle,
                rack,
                shelf,
                capacity: parseInt(capacity),
                locationType: locationType || 'storage',
                isBlocked: Boolean(isBlocked),
            }
        });
        res.status(201).json(location);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create location' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { name, zone, aisle, rack, shelf, capacity, locationType, isBlocked } = req.body;
        const location = await db_1.default.location.update({
            where: { id: req.params.id },
            data: {
                name,
                zone,
                aisle,
                rack,
                shelf,
                capacity: parseInt(capacity),
                locationType: locationType || undefined,
                isBlocked: isBlocked === undefined ? undefined : Boolean(isBlocked),
            }
        });
        res.json(location);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update location' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await db_1.default.location.delete({ where: { id: req.params.id } });
        res.json({ message: 'Location deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete location' });
    }
});
exports.default = router;

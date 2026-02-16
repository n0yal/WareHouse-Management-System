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
        const suppliers = await db_1.default.supplier.findMany({
            include: { products: true }
        });
        res.json(suppliers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const supplier = await db_1.default.supplier.findUnique({
            where: { id: req.params.id },
            include: { products: true }
        });
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.json(supplier);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const supplier = await db_1.default.supplier.create({
            data: { name, email, phone, address }
        });
        res.status(201).json(supplier);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create supplier' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const supplier = await db_1.default.supplier.update({
            where: { id: req.params.id },
            data: { name, email, phone, address }
        });
        res.json(supplier);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update supplier' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await db_1.default.supplier.delete({ where: { id: req.params.id } });
        res.json({ message: 'Supplier deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});
exports.default = router;

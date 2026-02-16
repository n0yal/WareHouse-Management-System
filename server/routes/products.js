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
        const products = await db_1.default.product.findMany({
            include: { inventories: true, supplier: true }
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const product = await db_1.default.product.findUnique({
            where: { id: req.params.id },
            include: { inventories: true, supplier: true }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, ean, sku, description, category, price, minStockLevel, supplierId } = req.body;
        const product = await db_1.default.product.create({
            data: {
                name,
                ean,
                sku,
                description,
                category,
                price: parseFloat(price),
                minStockLevel: parseInt(minStockLevel),
                supplierId
            }
        });
        res.status(201).json(product);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create product' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { name, ean, sku, description, category, price, minStockLevel, supplierId } = req.body;
        const product = await db_1.default.product.update({
            where: { id: req.params.id },
            data: {
                name,
                ean,
                sku,
                description,
                category,
                price: parseFloat(price),
                minStockLevel: parseInt(minStockLevel),
                supplierId
            }
        });
        res.json(product);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update product' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await db_1.default.product.delete({ where: { id: req.params.id } });
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
exports.default = router;

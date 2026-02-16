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
        const orders = await db_1.default.order.findMany({
            include: { customer: true, orderItems: { include: { product: true } } }
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const order = await db_1.default.order.findUnique({
            where: { id: req.params.id },
            include: { customer: true, orderItems: { include: { product: true } } }
        });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { orderNumber, customerId, type, status, totalAmount, notes, orderItems } = req.body;
        const order = await db_1.default.order.create({
            data: {
                orderNumber,
                customerId,
                type,
                status: status || 'pending',
                totalAmount: totalAmount ? parseFloat(totalAmount) : null,
                notes,
                orderItems: orderItems ? {
                    create: orderItems.map((item) => ({
                        productId: item.productId,
                        quantity: parseInt(item.quantity),
                        unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null
                    }))
                } : undefined
            },
            include: { customer: true, orderItems: { include: { product: true } } }
        });
        res.status(201).json(order);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create order' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { orderNumber, customerId, type, status, totalAmount, notes } = req.body;
        const order = await db_1.default.order.update({
            where: { id: req.params.id },
            data: { orderNumber, customerId, type, status, totalAmount: totalAmount ? parseFloat(totalAmount) : null, notes }
        });
        res.json(order);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update order' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await db_1.default.order.delete({ where: { id: req.params.id } });
        res.json({ message: 'Order deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete order' });
    }
});
exports.default = router;

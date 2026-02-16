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
        const customers = await db_1.default.customer.findMany({
            include: { orders: true }
        });
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const customer = await db_1.default.customer.findUnique({
            where: { id: req.params.id },
            include: { orders: true }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const customer = await db_1.default.customer.create({
            data: { name, email, phone, address }
        });
        res.status(201).json(customer);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create customer' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const customer = await db_1.default.customer.update({
            where: { id: req.params.id },
            data: { name, email, phone, address }
        });
        res.json(customer);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update customer' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await db_1.default.customer.delete({ where: { id: req.params.id } });
        res.json({ message: 'Customer deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});
exports.default = router;

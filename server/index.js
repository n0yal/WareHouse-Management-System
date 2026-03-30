"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path = require("path");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));
app.use(express_1.default.json());
const products_1 = __importDefault(require("./routes/products"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const customers_1 = __importDefault(require("./routes/customers"));
const orders_1 = __importDefault(require("./routes/orders"));
const locations_1 = __importDefault(require("./routes/locations"));
const racks_1 = __importDefault(require("./routes/racks"));
const warehouse_1 = __importDefault(require("./routes/warehouse"));
const db_1 = __importDefault(require("./db"));
const expiryNotifier_1 = require("./services/expiryNotifier");
app.use('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date() });
});
app.get('/api/health/db', async (req, res) => {
    try {
        await db_1.default.$queryRaw `SELECT 1`;
        res.json({ status: 'Database is connected', timestamp: new Date() });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ status: 'Database connection failed', detail, timestamp: new Date() });
    }
});
app.use('/api/products', products_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/suppliers', suppliers_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/locations', locations_1.default);
app.use('/api/racks', racks_1.default);
app.use('/api/warehouse', warehouse_1.default);
// Serve static files from the React app
app.use(express_1.default.static(path.join(__dirname, '..', 'build')));
// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
    (0, expiryNotifier_1.scheduleDailyExpiryNotifications)();
}
module.exports = app;
module.exports.default = app;

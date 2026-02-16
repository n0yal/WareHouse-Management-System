"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
require("dotenv/config");
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/warehouse_db';
const pool = new pg_1.default.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    // Create a supplier first
    const supplier = await prisma.supplier.upsert({
        where: { id: 'default-supplier' },
        update: {},
        create: {
            id: 'default-supplier',
            name: 'Default Supplier',
            email: 'supplier@example.com',
            phone: '123-456-7890',
            address: '123 Supply St'
        }
    });
    // Create system customer for inbound orders
    const customer = await prisma.customer.upsert({
        where: { id: 'system' },
        update: {},
        create: {
            id: 'system',
            name: 'System',
            email: 'system@warehouse.local'
        }
    });
    // Create sample products with SKUs
    const products = [
        { name: 'Widget A', sku: 'SKU001', category: 'Electronics', price: 19.99, minStockLevel: 10 },
        { name: 'Widget B', sku: 'SKU002', category: 'Electronics', price: 29.99, minStockLevel: 5 },
        { name: 'Gadget X', sku: 'SKU003', category: 'Gadgets', price: 49.99, minStockLevel: 3 },
        { name: 'Tool Kit', sku: 'SKU004', category: 'Tools', price: 89.99, minStockLevel: 2 },
        { name: 'Part Alpha', sku: 'SKU005', category: 'Parts', price: 5.99, minStockLevel: 100 },
    ];
    for (const p of products) {
        await prisma.product.upsert({
            where: { sku: p.sku },
            update: p,
            create: { ...p, supplierId: supplier.id }
        });
    }
    // Create sample locations
    const locations = [
        { name: 'Receiving Zone', zone: 'R', aisle: '0', rack: '0', shelf: '0', capacity: 1000, locationType: 'receiving' },
        { name: 'Zone A Rack 1', zone: 'A', aisle: '1', rack: '1', shelf: '1', capacity: 100, locationType: 'storage' },
        { name: 'Zone A Rack 2', zone: 'A', aisle: '1', rack: '2', shelf: '1', capacity: 100, locationType: 'storage' },
        { name: 'Zone B Rack 1', zone: 'B', aisle: '1', rack: '1', shelf: '1', capacity: 150, locationType: 'storage' },
    ];
    for (const l of locations) {
        await prisma.location.upsert({
            where: { id: `${l.zone}-${l.aisle}-${l.rack}` },
            update: l,
            create: { id: `${l.zone}-${l.aisle}-${l.rack}`, ...l }
        });
    }
    const racks = [
        { rackCode: 'A-1-1', zoneType: 'NORMAL', capacity: 100 },
        { rackCode: 'A-1-2', zoneType: 'FRAGILE', capacity: 100 },
        { rackCode: 'B-1-1', zoneType: 'TOXIC', capacity: 150 },
        { rackCode: 'C-1-1', zoneType: 'INFLAMMABLE', capacity: 120 },
    ];
    // Backward-safe: if Prisma client/schema is not regenerated yet, `prisma.rack` can be undefined.
    if (prisma.rack && typeof prisma.rack.upsert === 'function') {
        for (const rack of racks) {
            await prisma.rack.upsert({
                where: { rackCode: rack.rackCode },
                update: {
                    zoneType: rack.zoneType,
                    capacity: rack.capacity,
                },
                create: {
                    rackCode: rack.rackCode,
                    zoneType: rack.zoneType,
                    capacity: rack.capacity,
                    currentLoad: 0,
                },
            });
        }
    }
    else {
        console.warn('[seed] Rack model is not available in Prisma client. Skipping rack seed. Run `npx prisma generate` after migrations.');
    }
    console.log('Seeded products and locations!');
}
main()
    .catch(e => {
    console.error('[seed] Failed:', e?.message || e);
    if (e?.code)
        console.error('[seed] code:', e.code);
    if (e?.meta)
        console.error('[seed] meta:', e.meta);
})
    .finally(() => prisma.$disconnect());

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
const ZONE_MAP = {
    'R': 'Receiving',
    'REC': 'Receiving',
    'RECV': 'Receiving',
    'RECEIVING': 'Receiving',
    'A': 'Storage A',
    'STORAGE_A': 'Storage A',
    'STORAGE-A': 'Storage A',
    'B': 'Storage B',
    'STORAGE_B': 'Storage B',
    'STORAGE-B': 'Storage B',
    'C': 'Storage C',
    'STORAGE_C': 'Storage C',
    'STORAGE-C': 'Storage C',
    'P': 'Packing',
    'PACK': 'Packing',
    'PACKING': 'Packing',
    'D': 'Dispatch',
    'DISP': 'Dispatch',
    'DISPATCH': 'Dispatch',
    'S': 'Storage A',
    'INFLAMMABLE': 'Storage A',
    'TOXIC': 'Storage B',
    'FRAGILE': 'Storage B',
    'NORMAL': 'Storage A',
};
const mapZone = (zone) => {
    const normalized = String(zone || '').toUpperCase().trim();
    return ZONE_MAP[normalized] || 'Storage A';
};
router.get('/layout', async (_req, res) => {
    try {
        const racks = await db_1.default.rack.findMany({ orderBy: { rackCode: 'asc' } });
        const inventory = await db_1.default.inventory.findMany({
            where: { rackLocation: { not: null } },
            include: { product: true }
        });
        const locations = await db_1.default.location.findMany();
        const rackMap = {};
        racks.forEach(rack => {
            const rackCode = rack.rackCode;
            const [zone] = rackCode.split('-');
            rackMap[rackCode] = {
                ...rack,
                zone: mapZone(zone),
                utilization: rack.capacity > 0 ? Math.round((rack.currentLoad / rack.capacity) * 100) : 0,
                items: []
            };
        });
        inventory.forEach(item => {
            if (item.rackLocation && rackMap[item.rackLocation]) {
                rackMap[item.rackLocation].items.push({
                    id: item.id,
                    productId: item.productId,
                    productName: item.product?.name || 'Unknown',
                    productSku: item.product?.sku || '-',
                    licensePlate: item.serialNumber,
                    lotNumber: item.lotNumber,
                    quantity: item.onHandQty,
                    expiryDate: item.expiryDate,
                    classification: item.classification
                });
            }
        });
        const zones = {
            'Receiving': { name: 'Receiving', color: '#3b82f6', racks: [] },
            'Storage A': { name: 'Storage A', color: '#22c55e', racks: [] },
            'Storage B': { name: 'Storage B', color: '#eab308', racks: [] },
            'Packing': { name: 'Packing', color: '#a855f7', racks: [] },
            'Dispatch': { name: 'Dispatch', color: '#f97316', racks: [] }
        };
        Object.values(rackMap).forEach(rack => {
            const zoneName = rack.zone;
            if (zones[zoneName]) {
                zones[zoneName].racks.push(rack);
            }
        });
        res.json({
            zones: Object.values(zones),
            totalRacks: racks.length,
            totalItems: inventory.length
        });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch warehouse layout', detail });
    }
});
router.get('/rack/:rackCode', async (req, res) => {
    try {
        const { rackCode } = req.params;
        const rack = await db_1.default.rack.findUnique({ where: { rackCode } });
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        const inventory = await db_1.default.inventory.findMany({
            where: { rackLocation: rackCode },
            include: { product: true, location: true }
        });
        const [zone] = rackCode.split('-');
        res.json({
            ...rack,
            zone: mapZone(zone),
            utilization: rack.capacity > 0 ? Math.round((rack.currentLoad / rack.capacity) * 100) : 0,
            items: inventory.map(item => ({
                id: item.id,
                productId: item.productId,
                productName: item.product?.name || 'Unknown',
                productSku: item.product?.sku || '-',
                licensePlate: item.serialNumber,
                lotNumber: item.lotNumber,
                quantity: item.onHandQty,
                expiryDate: item.expiryDate,
                classification: item.classification,
                location: item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.rack}-${item.location.shelf}` : '-'
            }))
        });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch rack details', detail });
    }
});
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || String(q).trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }
        const searchTerm = String(q).trim().toLowerCase();
        const inventory = await db_1.default.inventory.findMany({
            where: {
                OR: [
                    { serialNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { lotNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { product: { name: { contains: searchTerm, mode: 'insensitive' } } },
                    { product: { sku: { contains: searchTerm, mode: 'insensitive' } } },
                    { product: { ean: { contains: searchTerm, mode: 'insensitive' } } }
                ]
            },
            include: { product: true, location: true }
        });
        const results = inventory.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.product?.name || 'Unknown',
            productSku: item.product?.sku || '-',
            productEan: item.product?.ean || '-',
            licensePlate: item.serialNumber,
            lotNumber: item.lotNumber,
            quantity: item.onHandQty,
            expiryDate: item.expiryDate,
            classification: item.classification,
            rackLocation: item.rackLocation,
            location: item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.rack}` : '-',
            status: item.rackLocation ? 'STORED' : 'RECEIVED'
        }));
        res.json(results);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to search inventory', detail });
    }
});

router.get('/seatmap', async (_req, res) => {
    try {
        const racks = await db_1.default.rack.findMany({ orderBy: { rackCode: 'asc' } });
        const inventory = await db_1.default.inventory.findMany({
            where: { 
                rackLocation: { not: null },
                onHandQty: { gt: 0 }
            },
            include: { product: true }
        });
        
        const rackBins = {};
        
        racks.forEach(rack => {
            const [zone] = rack.rackCode.split('-');
            const bins = [];
            for (let i = 0; i < rack.capacity; i++) {
                bins.push({
                    position: i + 1,
                    occupied: false,
                    item: null
                });
            }
            rackBins[rack.rackCode] = {
                rackCode: rack.rackCode,
                zone: mapZone(zone),
                capacity: rack.capacity,
                currentLoad: rack.currentLoad,
                utilization: rack.capacity > 0 ? Math.round((rack.currentLoad / rack.capacity) * 100) : 0,
                bins: bins
            };
        });
        
        const itemsByRack = {};
        inventory.forEach(item => {
            if (!itemsByRack[item.rackLocation]) {
                itemsByRack[item.rackLocation] = [];
            }
            itemsByRack[item.rackLocation].push({
                id: item.id,
                productId: item.productId,
                productName: item.product?.name || 'Unknown',
                productSku: item.product?.sku || '-',
                licensePlate: item.serialNumber,
                lotNumber: item.lotNumber,
                quantity: item.onHandQty,
                classification: item.classification,
                expiryDate: item.expiryDate
            });
        });
        
        Object.keys(itemsByRack).forEach(rackCode => {
            if (rackBins[rackCode]) {
                const items = itemsByRack[rackCode];
                items.forEach((item, index) => {
                    if (index < rackBins[rackCode].bins.length) {
                        rackBins[rackCode].bins[index] = {
                            ...rackBins[rackCode].bins[index],
                            occupied: true,
                            item: item
                        };
                    }
                });
            }
        });
        const zones = {
            'Receiving': { name: 'Receiving', color: '#3b82f6', racks: [] },
            'Storage A': { name: 'Storage A', color: '#22c55e', racks: [] },
            'Storage B': { name: 'Storage B', color: '#eab308', racks: [] },
            'Storage C': { name: 'Storage C', color: '#14b8a6', racks: [] },
            'Packing': { name: 'Packing', color: '#a855f7', racks: [] },
            'Dispatch': { name: 'Dispatch', color: '#f97316', racks: [] }
        };
        Object.values(rackBins).forEach(rack => {
            const zoneName = rack.zone;
            if (zones[zoneName]) {
                zones[zoneName].racks.push(rack);
            }
        });
        
        res.json({
            zones: Object.values(zones),
            totalRacks: racks.length,
            totalItems: inventory.length
        });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch seat map', detail });
    }
});

exports.default = router;

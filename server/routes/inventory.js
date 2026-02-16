"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
const HAZARD_CLASSIFICATIONS = ["INFLAMMABLE", "TOXIC", "FRAGILE", "NORMAL"];
const normalizeClassification = (value) => {
    const normalized = String(value || "NORMAL").trim().toUpperCase();
    return HAZARD_CLASSIFICATIONS.includes(normalized) ? normalized : "NORMAL";
};
const toStorageStatus = (record) => {
    if ((record.onHandQty || 0) <= 0) {
        return 'SHIPPED';
    }
    if (record.rackLocation) {
        return 'STORED';
    }
    const location = record.location;
    if (!location) {
        return 'RECEIVED';
    }
    const isReceiving = location.locationType === 'receiving'
        || String(location.zone || '').toUpperCase() === 'R'
        || String(location.name || '').toLowerCase().includes('receiving');
    return isReceiving ? 'RECEIVED' : 'STORED';
};
const getLegacyStatus = (record) => {
    const availableQty = record.onHandQty - record.allocatedQty - record.holdQty - record.damagedQty;
    if (availableQty <= 0)
        return 'out_of_stock';
    if (availableQty < 10)
        return 'low_stock';
    return 'in_stock';
};
const toLegacyShape = (record) => {
    const availableQty = record.onHandQty - record.allocatedQty - record.holdQty - record.damagedQty;
    return {
        ...record,
        quantity: availableQty,
        status: getLegacyStatus(record),
        storageStatus: toStorageStatus(record),
        classification: normalizeClassification(record.classification),
        rackLocation: record.rackLocation || null,
        lastUpdated: record.updatedAt,
    };
};
const classifyWithExternalAi = async ({ name, description }) => {
    const trimmedName = String(name || "").trim();
    const trimmedDescription = String(description || "").trim();
    if (!trimmedName && !trimmedDescription) {
        return "NORMAL";
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = String(process.env.GEMINI_MODEL || "gemini-2.5-flash")
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/^models\//, "");
    const aiUrl = process.env.AI_CLASSIFIER_URL;
    const extractClassification = (value) => {
        const text = String(value || "").trim().toUpperCase();
        const matched = text.match(/\b(INFLAMMABLE|TOXIC|FRAGILE|NORMAL)\b/);
        if (matched) {
            return normalizeClassification(matched[1]);
        }
        // Gemini can occasionally return truncated prefixes like "IN", "TO", "FR", "NO".
        if (text === "IN" || text.startsWith("INFL")) {
            return "INFLAMMABLE";
        }
        if (text === "TO" || text.startsWith("TOX")) {
            return "TOXIC";
        }
        if (text === "FR" || text.startsWith("FRA")) {
            return "FRAGILE";
        }
        if (text === "NO" || text.startsWith("NOR")) {
            return "NORMAL";
        }
        return null;
    };
    try {
        if (geminiApiKey) {
            const prompt = `Return ONLY one word from this list: INFLAMMABLE, TOXIC, FRAGILE, NORMAL.
Product name: ${trimmedName || "N/A"}.
Product description: ${trimmedDescription || "N/A"}.`;
            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": geminiApiKey,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 16,
                    },
                }),
            });
            if (!geminiResponse.ok) {
                throw new Error(`Gemini API request failed with status ${geminiResponse.status}`);
            }
            const body = await geminiResponse.json().catch(() => ({}));
            const rawText = body?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join(" ").trim() || "";
            if (rawText) {
                const fromText = extractClassification(rawText);
                if (fromText) {
                    return fromText;
                }
            }
            throw new Error(`Gemini returned unsupported classification: ${JSON.stringify(rawText)}`);
        }
        if (!aiUrl) {
            return "NORMAL";
        }
        const response = await fetch(aiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(process.env.AI_CLASSIFIER_API_KEY
                    ? { Authorization: `Bearer ${process.env.AI_CLASSIFIER_API_KEY}` }
                    : {}),
            },
            body: JSON.stringify({
                name: trimmedName || null,
                description: trimmedDescription || null,
            }),
        });
        if (!response.ok) {
            throw new Error(`AI API request failed with status ${response.status}`);
        }
        const body = await response.json().catch(() => ({}));
        const candidate = body.classification || body.label || body.result || body.category;
        const classification = normalizeClassification(candidate);
        if (classification === "NORMAL" && String(candidate || "").trim().toUpperCase() !== "NORMAL") {
            throw new Error(`AI API returned invalid classification: ${JSON.stringify(candidate)}`);
        }
        return classification;
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        console.error(`[AI CLASSIFICATION] Failed for product \"${trimmedName}\" / description \"${trimmedDescription}\": ${detail}`);
        return "NORMAL";
    }
};
const suggestRack = async (classification) => {
    const candidates = await db_1.default.rack.findMany({
        where: {
            zoneType: normalizeClassification(classification),
        },
        orderBy: { rackCode: 'asc' },
    });
    return candidates.find((rack) => rack.currentLoad < rack.capacity) || null;
};
const findInventoryByLicensePlate = async (licensePlate) => {
    return db_1.default.inventory.findFirst({
        where: { serialNumber: licensePlate },
        include: { product: true, location: true },
        orderBy: { createdAt: 'desc' },
    });
};
router.get('/', async (req, res) => {
    try {
        const inventory = await db_1.default.inventory.findMany({
            include: { product: true, location: true }
        });
        res.json(inventory.map(toLegacyShape));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});
router.get('/location/:locationId', async (req, res) => {
    try {
        const inventory = await db_1.default.inventory.findMany({
            where: { locationId: req.params.locationId },
            include: { product: true, location: true }
        });
        res.json(inventory.map(toLegacyShape));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory by location' });
    }
});
router.get('/putaway-queue', async (req, res) => {
    try {
        const queue = await db_1.default.inventory.findMany({
            where: {
                onHandQty: { gt: 0 },
                rackLocation: null,
            },
            include: { product: true, location: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(queue.map(toLegacyShape));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch putaway queue' });
    }
});
router.get('/putaway-suggestion/:licensePlate', async (req, res) => {
    try {
        const licensePlate = String(req.params.licensePlate || '').trim();
        if (!licensePlate) {
            return res.status(400).json({ error: 'licensePlate is required' });
        }
        const inventory = await findInventoryByLicensePlate(licensePlate);
        if (!inventory) {
            return res.status(404).json({ error: `No inventory found for license_plate ${licensePlate}` });
        }
        if (toStorageStatus(inventory) !== 'RECEIVED') {
            return res.status(400).json({ error: `Putaway not allowed: inventory status is ${toStorageStatus(inventory)}` });
        }
        const rack = await suggestRack(inventory.classification);
        if (!rack) {
            return res.status(404).json({ error: 'No suitable rack available' });
        }
        res.json({ inventory: toLegacyShape(inventory), suggestedRack: rack });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: 'Failed to suggest rack', detail });
    }
});
router.post('/', async (req, res) => {
    try {
        const { productId, quantity, locationId, updatedBy, lotNumber = null, serialNumber = null, expiryDate = null, txnType = 'adjust', referenceType = 'MANUAL', referenceId = null, reason = 'Inventory upsert via API', } = req.body;
        const nextOnHandQty = parseInt(quantity);
        const existing = await db_1.default.inventory.findFirst({
            where: { productId, locationId, lotNumber, serialNumber },
            include: { product: true },
        });
        const product = existing?.product || (await db_1.default.product.findUnique({ where: { id: productId } }));
        const shouldClassify = String(txnType).toLowerCase() === 'receive';
        const inboundClassification = shouldClassify
            ? await classifyWithExternalAi({
                name: product?.name || "",
                description: product?.description || "",
            })
            : normalizeClassification(req.body.classification || existing?.classification || 'NORMAL');
        let inventory;
        if (existing) {
            inventory = await db_1.default.inventory.update({
                where: { id: existing.id },
                data: {
                    onHandQty: Number.isNaN(nextOnHandQty) ? 0 : nextOnHandQty,
                    classification: inboundClassification,
                    updatedBy,
                    expiryDate: expiryDate ? new Date(expiryDate) : existing.expiryDate,
                },
                include: { product: true, location: true },
            });
        }
        else {
            inventory = await db_1.default.inventory.create({
                data: {
                    productId,
                    locationId,
                    lotNumber,
                    serialNumber,
                    classification: inboundClassification,
                    rackLocation: null,
                    expiryDate: expiryDate ? new Date(expiryDate) : null,
                    onHandQty: Number.isNaN(nextOnHandQty) ? 0 : nextOnHandQty,
                    allocatedQty: 0,
                    holdQty: 0,
                    damagedQty: 0,
                    updatedBy,
                },
                include: { product: true, location: true },
            });
        }
        await db_1.default.inventoryTransaction.create({
            data: {
                productId,
                locationId,
                lotNumber,
                serialNumber,
                txnType,
                qty: Number.isNaN(nextOnHandQty) ? 0 : nextOnHandQty,
                referenceType,
                referenceId,
                reason,
                createdBy: updatedBy,
            },
        });
        res.json(toLegacyShape(inventory));
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: 'Failed to update inventory', detail });
    }
});
router.post('/putaway', async (req, res) => {
    try {
        const { licensePlate, rackCode: rackCodeRaw, targetRackCode, updatedBy } = req.body;
        const rackCode = String(rackCodeRaw || targetRackCode || '').trim();
        if (!licensePlate || !rackCode) {
            return res.status(400).json({ error: 'licensePlate and rackCode are required' });
        }
        const rack = await db_1.default.rack.findUnique({ where: { rackCode } });
        if (!rack) {
            return res.status(404).json({ error: 'Target rack not found' });
        }
        const receivingInventory = await findInventoryByLicensePlate(licensePlate);
        if (!receivingInventory) {
            return res.status(404).json({ error: 'License Plate not found in receiving zone' });
        }
        if (toStorageStatus(receivingInventory) !== 'RECEIVED') {
            return res.status(400).json({
                error: `Putaway blocked: inventory status is ${toStorageStatus(receivingInventory)}. Only RECEIVED items can be put away.`,
            });
        }
        const classification = normalizeClassification(receivingInventory.classification);
        if (normalizeClassification(rack.zoneType) !== classification) {
            return res.status(400).json({
                error: `Rack zone mismatch: inventory is ${classification}, rack zone is ${normalizeClassification(rack.zoneType)}`,
            });
        }
        if (rack.currentLoad >= rack.capacity || rack.currentLoad + receivingInventory.onHandQty > rack.capacity) {
            return res.status(400).json({ error: 'No suitable rack available' });
        }
        const [zone, aisle, rackPart] = rack.rackCode.split('-');
        const mappedLocation = await db_1.default.location.findFirst({
            where: {
                OR: [
                    { id: rack.rackCode },
                    { AND: [{ zone: zone || '' }, { aisle: aisle || '' }, { rack: rackPart || '' }] },
                ],
            },
        });
        const updated = await db_1.default.$transaction(async (tx) => {
            await tx.rack.update({
                where: { id: rack.id },
                data: {
                    currentLoad: { increment: receivingInventory.onHandQty },
                },
            });
            const moved = await tx.inventory.update({
                where: { id: receivingInventory.id },
                data: {
                    rackLocation: rack.rackCode,
                    locationId: mappedLocation?.id || receivingInventory.locationId,
                    updatedBy,
                },
                include: { product: true, location: true },
            });
            await tx.inventoryTransaction.create({
                data: {
                    productId: moved.productId,
                    locationId: moved.locationId,
                    lotNumber: moved.lotNumber,
                    serialNumber: moved.serialNumber,
                    txnType: 'putaway',
                    qty: moved.onHandQty,
                    referenceType: 'LICENSE_PLATE',
                    referenceId: licensePlate,
                    reason: `Putaway to ${rack.rackCode}`,
                    createdBy: updatedBy,
                },
            });
            return moved;
        });
        res.json(toLegacyShape(updated));
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: 'Failed to complete putaway', detail });
    }
});
router.post('/dispatch', async (req, res) => {
    try {
        const { licensePlate, quantityToDispatch, updatedBy } = req.body;
        const parsedQty = parseInt(quantityToDispatch);
        if (!licensePlate) {
            return res.status(400).json({ error: 'licensePlate is required' });
        }
        if (Number.isNaN(parsedQty) || parsedQty <= 0) {
            return res.status(400).json({ error: 'quantity_to_dispatch must be greater than 0' });
        }
        const inventory = await findInventoryByLicensePlate(licensePlate);
        if (!inventory) {
            return res.status(404).json({ error: `No inventory found for license_plate ${licensePlate}` });
        }
        const currentStatus = toStorageStatus(inventory);
        if (currentStatus !== 'STORED') {
            return res.status(400).json({
                error: `Dispatch blocked: inventory status is ${currentStatus}. Only STORED items can be dispatched.`,
            });
        }
        const availableQty = inventory.onHandQty - inventory.allocatedQty - inventory.holdQty - inventory.damagedQty;
        if (availableQty <= 0) {
            return res.status(400).json({ error: 'Dispatch blocked: no available quantity to dispatch' });
        }
        if (parsedQty > availableQty) {
            return res.status(400).json({
                error: `Dispatch quantity (${parsedQty}) exceeds available quantity (${availableQty})`,
            });
        }
        const nextOnHand = inventory.onHandQty - parsedQty;
        if (nextOnHand < 0) {
            return res.status(400).json({ error: 'Dispatch blocked: negative inventory is not allowed' });
        }
        const updated = await db_1.default.$transaction(async (tx) => {
            if (inventory.rackLocation) {
                const rack = await tx.rack.findUnique({ where: { rackCode: inventory.rackLocation } });
                if (rack) {
                    const decrementBy = Math.min(parsedQty, rack.currentLoad);
                    await tx.rack.update({
                        where: { id: rack.id },
                        data: {
                            currentLoad: { decrement: decrementBy },
                        },
                    });
                }
            }
            const moved = await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    onHandQty: nextOnHand,
                    updatedBy,
                },
                include: { product: true, location: true },
            });
            await tx.inventoryTransaction.create({
                data: {
                    productId: moved.productId,
                    locationId: moved.locationId,
                    lotNumber: moved.lotNumber,
                    serialNumber: moved.serialNumber,
                    txnType: 'outbound_dispatch',
                    qty: parsedQty,
                    referenceType: 'LICENSE_PLATE',
                    referenceId: licensePlate,
                    reason: 'Outbound dispatch',
                    createdBy: updatedBy,
                },
            });
            return moved;
        });
        res.json({
            message: nextOnHand === 0
                ? 'Dispatch successful. Inventory quantity is 0 and status is now SHIPPED.'
                : 'Dispatch successful.',
            dispatchedQty: parsedQty,
            availableBefore: availableQty,
            availableAfter: nextOnHand - updated.allocatedQty - updated.holdQty - updated.damagedQty,
            inventory: toLegacyShape(updated),
        });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: 'Failed to dispatch inventory', detail });
    }
});
router.get('/dispatch-history', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const history = await db_1.default.inventoryTransaction.findMany({
            where: { txnType: 'outbound_dispatch' },
            include: { product: true, location: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        res.json(history.map((item) => ({
            id: item.id,
            licensePlate: item.serialNumber,
            qty: item.qty,
            referenceType: item.referenceType,
            referenceId: item.referenceId,
            reason: item.reason,
            createdBy: item.createdBy,
            createdAt: item.createdAt,
            product: item.product,
            location: item.location,
            txnType: item.txnType,
        })));
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch dispatch history', detail });
    }
});
router.get('/alerts/low-stock', async (req, res) => {
    try {
        const lowStockItems = await db_1.default.inventory.findMany({
            include: { product: true, location: true }
        });
        res.json(lowStockItems.map(toLegacyShape).filter((item) => item.status === 'low_stock'));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const inventory = await db_1.default.inventory.findUnique({
            where: { id: req.params.id },
            include: { product: true, location: true },
        });
        if (!inventory) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        await db_1.default.inventory.delete({ where: { id: inventory.id } });
        if (inventory.rackLocation && db_1.default.rack && typeof db_1.default.rack.findUnique === 'function') {
            try {
                const rack = await db_1.default.rack.findUnique({ where: { rackCode: inventory.rackLocation } });
                if (rack) {
                    const decrementBy = Math.min(inventory.onHandQty || 0, rack.currentLoad || 0);
                    if (decrementBy > 0) {
                        await db_1.default.rack.update({
                            where: { id: rack.id },
                            data: { currentLoad: { decrement: decrementBy } },
                        });
                    }
                }
            }
            catch (rackError) {
                const rackDetail = rackError instanceof Error ? rackError.message : 'Unknown rack update error';
                console.warn(`[inventory/delete] Rack load update skipped for ${inventory.id}: ${rackDetail}`);
            }
        }
        if (db_1.default.inventoryTransaction && typeof db_1.default.inventoryTransaction.create === 'function') {
            try {
                await db_1.default.inventoryTransaction.create({
                    data: {
                        productId: inventory.productId,
                        locationId: inventory.locationId,
                        lotNumber: inventory.lotNumber,
                        serialNumber: inventory.serialNumber,
                        txnType: 'delete',
                        qty: inventory.onHandQty || 0,
                        referenceType: 'INVENTORY_ID',
                        referenceId: inventory.id,
                        reason: 'Inventory row deleted by admin',
                        createdBy: 'admin',
                    },
                });
            }
            catch (logError) {
                const logDetail = logError instanceof Error ? logError.message : 'Unknown transaction log error';
                console.warn(`[inventory/delete] Transaction log skipped for ${inventory.id}: ${logDetail}`);
            }
        }
        res.json({ message: 'Inventory item removed successfully' });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: 'Failed to remove inventory item', detail });
    }
});
exports.default = router;

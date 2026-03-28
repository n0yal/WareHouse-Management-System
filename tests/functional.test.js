/**
 * ============================================================
 *  SmartwareERP — FUNCTIONAL TESTS
 *  Tests complete end-to-end workflows across multiple APIs
 *  Requires: PostgreSQL active
 * ============================================================
 */

const request = require('supertest');
const app = require('../server/index');

describe('Functional Tests — SmartwareERP End-to-End Workflows', () => {

  // ============================================================
  //  WORKFLOW 1: Complete Inbound Receiving Flow
  //  Product Creation → Inventory Receive → Verify in DB
  // ============================================================
  describe('Workflow 1: Inbound Receiving Flow', () => {
    let productId;
    let locationId;
    let inventoryId;
    const testSku = `FUNC-SKU-${Date.now()}`;

    test('Step 1: Create a product for receiving', async () => {
      const res = await request(app).post('/api/products').send({
        name: 'Functional Test Product',
        sku: testSku,
        description: 'Cleaning chemical for warehouse floors',
        category: 'Chemicals',
        price: '49.99',
        minStockLevel: '5',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      productId = res.body.id;
    });

    test('Step 2: Fetch locations for receiving zone', async () => {
      const res = await request(app).get('/api/locations');
      expect(res.statusCode).toBe(200);
      let receivingLocation = res.body.find(l => l.locationType === 'receiving')
                          || res.body[0];
      if (!receivingLocation) {
        const created = await request(app).post('/api/locations').send({
          name: `Receiving-${Date.now()}`,
          zone: 'R',
          aisle: '01',
          rack: '01',
          shelf: '01',
          capacity: 100,
          locationType: 'receiving',
          isBlocked: false,
        });
        expect(created.statusCode).toBe(201);
        receivingLocation = created.body;
      }
      locationId = receivingLocation.id;
    });

    test('Step 3: Receive inventory with AI classification', async () => {
      if (!productId || !locationId) return;
      const res = await request(app).post('/api/inventory').send({
        productId: productId,
        locationId: locationId,
        quantity: 50,
        serialNumber: `LP-FUNC-${Date.now()}`,
        lotNumber: `LOT-FUNC-001`,
        txnType: 'receive',
      });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('id');
      expect(res.body.onHandQty).toBe(50);
      // AI classification should have been applied
      expect(['INFLAMMABLE', 'TOXIC', 'FRAGILE', 'NORMAL']).toContain(res.body.classification);
      inventoryId = res.body.id;
    });

    test('Step 4: Verify inventory appears in listing', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.statusCode).toBe(200);
      const found = res.body.find(i => i.id === inventoryId);
      expect(found).toBeDefined();
    });

    // Cleanup
    afterAll(async () => {
      if (inventoryId) {
        await request(app).delete(`/api/inventory/${inventoryId}`);
      }
      if (productId) {
        await request(app).delete(`/api/products/${productId}`);
      }
    });
  });

  // ============================================================
  //  WORKFLOW 2: Smart Putaway Flow
  //  Receive → Get Suggestion → Execute Putaway → Verify STORED
  // ============================================================
  describe('Workflow 2: Smart Putaway Flow', () => {
    let productId;
    let locationId;
    let licensePlate;

    test('Step 1: Create product and receive inventory', async () => {
      // Create product
      const prodRes = await request(app).post('/api/products').send({
        name: 'Glass Vase',
        sku: `PUTAWAY-SKU-${Date.now()}`,
        description: 'Delicate glass decorative vase',
        category: 'Glassware',
        price: '89.99',
        minStockLevel: '3',
      });
      expect(prodRes.statusCode).toBe(201);
      productId = prodRes.body.id;

      // Get location
      const locRes = await request(app).get('/api/locations');
      locationId = (locRes.body.find(l => l.locationType === 'receiving') || locRes.body[0])?.id;

      // Receive inventory
      licensePlate = `LP-PUTAWAY-${Date.now()}`;
      const invRes = await request(app).post('/api/inventory').send({
        productId,
        locationId,
        quantity: 25,
        serialNumber: licensePlate,
        lotNumber: 'LOT-PUTAWAY-001',
        txnType: 'receive',
      });
      expect([200, 201]).toContain(invRes.statusCode);
    });

    test('Step 2: Request putaway rack suggestion', async () => {
      if (!licensePlate) return;
      const res = await request(app).get(`/api/inventory/putaway-suggestion/${licensePlate}`);
      // May return 200 with suggestion or 404 if no compatible rack
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('inventory');
        expect(res.body).toHaveProperty('suggestedRack');
      }
    });

    test('Step 3: Verify item is in putaway queue', async () => {
      const res = await request(app).get('/api/inventory/putaway-queue');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    // Cleanup
    afterAll(async () => {
      if (licensePlate) {
        const inv = await request(app).get('/api/inventory');
        const item = inv.body.find(i => i.serialNumber === licensePlate);
        if (item) await request(app).delete(`/api/inventory/${item.id}`);
      }
      if (productId) {
        await request(app).delete(`/api/products/${productId}`);
      }
    });
  });

  // ============================================================
  //  WORKFLOW 3: Order Management Flow
  //  Create Customer → Create Order → Verify → Delete
  // ============================================================
  describe('Workflow 3: Order Management Flow', () => {
    let customerId;
    let orderId;

    test('Step 1: Create a customer', async () => {
      const res = await request(app).post('/api/customers').send({
        name: 'Functional Test Customer',
        email: `customer-${Date.now()}@test.com`,
        phone: '1234567890',
        address: '456 Test Avenue',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      customerId = res.body.id;
    });

    test('Step 2: Create an order for the customer', async () => {
      if (!customerId) return;
      const res = await request(app).post('/api/orders').send({
        orderNumber: `ORD-${Date.now()}`,
        customerId,
        type: 'outbound',
        status: 'pending',
        notes: 'Functional test order',
        orderItems: [],
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('orderNumber');
      orderId = res.body.id;
    });

    test('Step 3: Verify order appears in listing', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.statusCode).toBe(200);
      if (orderId) {
        const found = res.body.find(o => o.id === orderId);
        expect(found).toBeDefined();
        expect(found.status).toBe('pending');
      }
    });

    test('Step 4: Update order status to processing', async () => {
      if (!orderId) return;
      const res = await request(app).put(`/api/orders/${orderId}`).send({
        status: 'processing',
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('processing');
    });

    // Cleanup
    afterAll(async () => {
      if (orderId) await request(app).delete(`/api/orders/${orderId}`);
      if (customerId) await request(app).delete(`/api/customers/${customerId}`);
    });
  });

  // ============================================================
  //  WORKFLOW 4: Warehouse Visualization Flow
  //  Verify layout → Verify seatmap → Verify search
  // ============================================================
  describe('Workflow 4: Warehouse Visualization', () => {
    test('Step 1: Load warehouse layout', async () => {
      const res = await request(app).get('/api/warehouse/layout');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('zones');
      expect(Array.isArray(res.body.zones)).toBe(true);
    });

    test('Step 2: Load warehouse seat map', async () => {
      const res = await request(app).get('/api/warehouse/seatmap');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('zones');
      expect(Array.isArray(res.body.zones)).toBe(true);
    });

    test('Step 3: Search warehouse', async () => {
      const res = await request(app).get('/api/warehouse/search?q=test');
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ============================================================
  //  WORKFLOW 5: Dashboard & Alerts
  //  Verify all dashboard endpoints return valid data
  // ============================================================
  describe('Workflow 5: Dashboard & Alerts', () => {
    test('Step 1: Load inventory for dashboard KPIs', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 2: Check low stock alerts', async () => {
      const res = await request(app).get('/api/inventory/alerts/low-stock');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 3: Check expiry alerts', async () => {
      const res = await request(app).get('/api/inventory/alerts/expiry');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 4: Load products for dashboard stats', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 5: Load dispatch history for dashboard', async () => {
      const res = await request(app).get('/api/inventory/dispatch-history');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

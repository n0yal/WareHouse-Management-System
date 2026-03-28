/**
 * ============================================================
 *  SmartwareERP — INTEGRATION TESTS
 *  Tests API endpoints against the Express app
 *  Requires: PostgreSQL active
 * ============================================================
 */

const request = require('supertest');
const app = require('../server/index');

describe('Integration Tests — SmartwareERP REST API', () => {

  // ---- 1. Health Check ----
  describe('GET /api/health', () => {
    test('should return server status 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('Server is running');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // ---- 2. Products API ----
  describe('Products API — /api/products', () => {
    let createdProductId;

    test('POST /api/products — should create a new product', async () => {
      const newProduct = {
        name: 'Test Widget',
        sku: `TEST-${Date.now()}`,
        ean: `EAN-${Date.now()}`,
        description: 'A test product for integration testing',
        category: 'Electronics',
        price: '29.99',
        minStockLevel: '10',
      };
      const res = await request(app).post('/api/products').send(newProduct);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Widget');
      expect(res.body.price).toBe(29.99);
      createdProductId = res.body.id;
    });

    test('GET /api/products — should return product list', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/products/:id — should return specific product', async () => {
      if (!createdProductId) return;
      const res = await request(app).get(`/api/products/${createdProductId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(createdProductId);
      expect(res.body.name).toBe('Test Widget');
    });

    test('GET /api/products/:id — should return 404 for invalid ID', async () => {
      const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    test('PUT /api/products/:id — should update product', async () => {
      if (!createdProductId) return;
      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .send({ name: 'Updated Widget', sku: `UPD-${Date.now()}`, price: '39.99', minStockLevel: '20', category: 'Electronics' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated Widget');
      expect(res.body.price).toBe(39.99);
    });

    test('DELETE /api/products/:id — should delete product', async () => {
      if (!createdProductId) return;
      const res = await request(app).delete(`/api/products/${createdProductId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Product deleted successfully');
    });
  });

  // ---- 3. Suppliers API ----
  describe('Suppliers API — /api/suppliers', () => {
    let createdSupplierId;

    test('POST /api/suppliers — should create a supplier', async () => {
      const res = await request(app).post('/api/suppliers').send({
        name: 'Test Supplier',
        email: `supplier-${Date.now()}@test.com`,
        phone: '9876543210',
        address: '123 Test Street',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Supplier');
      createdSupplierId = res.body.id;
    });

    test('GET /api/suppliers — should return supplier list', async () => {
      const res = await request(app).get('/api/suppliers');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('DELETE /api/suppliers/:id — should delete supplier', async () => {
      if (!createdSupplierId) return;
      const res = await request(app).delete(`/api/suppliers/${createdSupplierId}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ---- 4. Customers API ----
  describe('Customers API — /api/customers', () => {
    test('GET /api/customers — should return customer list', async () => {
      const res = await request(app).get('/api/customers');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---- 5. Racks API ----
  describe('Racks API — /api/racks', () => {
    test('GET /api/racks — should return rack list', async () => {
      const res = await request(app).get('/api/racks');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST /api/racks — should create a rack', async () => {
      const res = await request(app).post('/api/racks').send({
        rackCode: `RACK-TEST-${Date.now()}`,
        zoneType: 'NORMAL',
        capacity: 100,
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.zoneType).toBe('NORMAL');
    });
  });

  // ---- 6. Locations API ----
  describe('Locations API — /api/locations', () => {
    test('GET /api/locations — should return location list', async () => {
      const res = await request(app).get('/api/locations');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---- 7. Orders API ----
  describe('Orders API — /api/orders', () => {
    test('GET /api/orders — should return order list', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---- 8. Warehouse API ----
  describe('Warehouse API — /api/warehouse', () => {
    test('GET /api/warehouse/layout — should return layout data', async () => {
      const res = await request(app).get('/api/warehouse/layout');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('zones');
      expect(Array.isArray(res.body.zones)).toBe(true);
    });

    test('GET /api/warehouse/seatmap — should return seat map', async () => {
      const res = await request(app).get('/api/warehouse/seatmap');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('zones');
      expect(Array.isArray(res.body.zones)).toBe(true);
    });
  });

  // ---- 9. Inventory API ----
  describe('Inventory API — /api/inventory', () => {
    test('GET /api/inventory — should return inventory list', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/inventory/alerts/low-stock — should return alerts', async () => {
      const res = await request(app).get('/api/inventory/alerts/low-stock');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/inventory/alerts/expiry — should return expiry alerts', async () => {
      const res = await request(app).get('/api/inventory/alerts/expiry');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/inventory/dispatch-history — should return dispatch log', async () => {
      const res = await request(app).get('/api/inventory/dispatch-history');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/inventory/putaway-queue — should return putaway queue', async () => {
      const res = await request(app).get('/api/inventory/putaway-queue');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

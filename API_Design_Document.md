# Warehouse Management System API Design

---

## 1. API Architecture Overview

| Aspect | Details |
|--------|---------|
| **Architecture** | RESTful API |
| **Protocol** | HTTP/JSON |
| **Base URL** | `http://localhost:5000/api` |
| **Server** | Express.js (Node.js) |
| **Database** | PostgreSQL with Prisma ORM |

---

## 2. API Endpoints

### Products Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/products` | List all products |
| `GET` | `/products/:id` | Get product by ID |
| `POST` | `/products` | Create new product |
| `PUT` | `/products/:id` | Update product |
| `DELETE` | `/products/:id` | Delete product |

### Inventory Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory` | List all inventory |
| `GET` | `/inventory/location/:locationId` | Get inventory by location |
| `GET` | `/inventory/putaway-queue` | Items pending putaway |
| `GET` | `/inventory/putaway-suggestion/:licensePlate` | AI-powered rack suggestion |
| `POST` | `/inventory` | Create/update inventory |
| `POST` | `/inventory/putaway` | Move to storage rack |
| `POST` | `/inventory/dispatch` | Ship inventory |
| `GET` | `/inventory/dispatch-history` | Shipment logs |
| `GET` | `/inventory/alerts/low-stock` | Low stock alerts |

### Supporting Modules

| Resource | Endpoints |
|----------|-----------|
| **Suppliers** | `GET`, `POST`, `PUT`, `DELETE /suppliers` |
| **Customers** | `GET`, `POST`, `PUT`, `DELETE /customers` |
| **Orders** | `GET`, `POST`, `PUT`, `DELETE /orders` |
| **Locations** | `GET`, `POST`, `PUT`, `DELETE /locations` |
| **Racks** | `GET`, `POST /racks` |

---

## 3. Data Models

### Entity Relationship Diagram

```
Product ──────< Inventory
     │               │
     │               ▼
     │         Location
     │
Supplier ────< Product

Customer ─────< Order
                    │
                    ▼
               OrderItem ───< Product
```

### Core Entities

| Entity | Key Attributes |
|--------|-----------------|
| **Product** | sku, name, ean, category, price, minStockLevel |
| **Inventory** | productId, locationId, onHandQty, classification, rackLocation, lotNumber, serialNumber |
| **Supplier** | name, email, phone, address |
| **Customer** | name, email, phone, address |
| **Order** | orderNumber, customerId, type, status, totalAmount |
| **Location** | zone, aisle, rack, shelf, capacity, locationType |
| **Rack** | rackCode, zoneType, capacity, currentLoad |

---

## 4. Key Features

### Hazard Classification System
- **AI Integration**: Automatically classifies products using Gemini API
- **Categories**: `INFLAMMABLE`, `TOXIC`, `FRAGILE`, `NORMAL`
- Ensures safe storage and handling

### Smart Putaway System
- License plate-based inventory tracking
- Auto-suggests suitable rack based on hazard classification
- Prevents incompatible storage

### Dispatch Management
- License plate verification before shipping
- Real-time inventory deduction
- Complete shipment history logging

### Stock Alerts
- Automatic low-stock detection
- Configurable minimum stock levels per product

---

## 5. Request/Response Flow

```
Client Request
     │
     ▼
┌─────────────────┐
│  Express        │ ──→ Input Validation
│  Server         │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│   Prisma        │ ──→ Query Builder
│   ORM           │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ PostgreSQL      │ ──→ Database Operations
│  Database       │
└─────────────────┘
     │
     ▼
   JSON Response
```

---

## 6. Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Frontend** | React + Vite |
| **UI Components** | Radix UI + Tailwind CSS |
| **AI Service** | Google Gemini API |

---

## 7. API Design Principles

- **RESTful Conventions**: Standard HTTP methods and status codes
- **Resource-Oriented URLs**: Clear, descriptive paths
- **JSON Responses**: Consistent response format
- **Error Handling**: Proper HTTP status codes (200, 400, 404, 500)
- **Data Validation**: Input sanitization and type conversion
- **Transaction Support**: Atomic operations for critical workflows

---

## 8. Sample API Calls

```bash
# Get all products
GET /api/products

# Get single product
GET /api/products/:id

# Create new product
POST /api/products
{
  "name": "Product Name",
  "sku": "PROD-001",
  "category": "Electronics",
  "price": 99.99,
  "minStockLevel": 10
}

# Create/Update inventory
POST /api/inventory
{
  "productId": "uuid",
  "quantity": 100,
  "locationId": "uuid",
  "txnType": "receive",
  "updatedBy": "admin"
}

# Get putaway suggestion
GET /api/inventory/putaway-suggestion/LP-12345

# Complete putaway
POST /api/inventory/putaway
{
  "licensePlate": "LP-12345",
  "rackCode": "A-01-01",
  "updatedBy": "admin"
}

# Dispatch inventory
POST /api/inventory/dispatch
{
  "licensePlate": "LP-12345",
  "quantityToDispatch": 50,
  "updatedBy": "admin"
}

# Get dispatch history
GET /api/inventory/dispatch-history?limit=100

# Get low stock alerts
GET /api/inventory/alerts/low-stock
```

---

## 9. Response Format

### Success Response
```json
{
  "id": "uuid",
  "name": "Product Name",
  "sku": "PROD-001",
  "price": 99.99
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

### List Response
```json
[
  { "id": "uuid", "name": "Item 1" },
  { "id": "uuid", "name": "Item 2" }
]
```

---

*This API design follows industry best practices for RESTful development while meeting the specific needs of warehouse management operations.*

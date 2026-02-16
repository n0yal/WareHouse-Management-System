# Wholesale ERP -> WMS UI Migration Checklist

Use this checklist to convert the current UI (`Dashboard`, `Inbound`, `Products`, `Orders`, `Customers`, `Suppliers`, `Reports`, `Settings`) into a warehouse-operations-first WMS.

## 1. Global UI and Navigation

### Sidebar (`src/components/Sidebar.tsx`)
- [ ] Rename product branding:
  - [ ] `WholeERP` -> warehouse/WMS product name.
  - [ ] Subtitle `Daily Necessities` -> site/warehouse identifier (example: `DC-01 Operations`).
- [ ] Replace menu structure to match warehouse workflow order.
- [ ] Remove sales/CRM-first sections from primary nav.
- [ ] Add/rename sections (target IDs):
  - [ ] `dashboard` -> `Operations Dashboard`
  - [ ] `inbound` -> `Receiving`
  - [ ] `putaway` (new)
  - [ ] `inventory` (replace `products`)
  - [ ] `picking` (split from `orders`)
  - [ ] `packing` (new)
  - [ ] `shipping` (new)
  - [ ] `returns` (new)
  - [ ] `cycle-count` (new)
  - [ ] Keep `reports` but warehouse-only metrics.
  - [ ] Keep `settings`.
- [ ] Add badge counters on nav items:
  - [ ] Receiving awaiting check-in.
  - [ ] Picks overdue.
  - [ ] Exceptions open.

### App routing/switch (`src/App.tsx`)
- [ ] Replace existing section switch with WMS sections.
- [ ] Split `orders` into dedicated flow pages:
  - [ ] Pick Queue
  - [ ] Pack Stations
  - [ ] Shipments
- [ ] Add placeholder page components first, then progressively move logic.

### Cross-screen UX standards
- [ ] Make barcode scan primary input on all operation screens.
- [ ] Add sticky action bars for high-frequency tasks (Receive, Confirm Putaway, Complete Pick).
- [ ] Add status color system (consistent everywhere):
  - [ ] `ready` (blue)
  - [ ] `in_progress` (amber)
  - [ ] `blocked/exception` (red)
  - [ ] `completed` (green)
- [ ] Add real-time refresh controls (`auto-refresh` toggle + `last updated`).

## 2. Dashboard Conversion

### Current file: `src/components/Dashboard.tsx`
- [ ] Replace title/subtitle:
  - [ ] `Dashboard Overview` -> `Warehouse Operations Dashboard`.
  - [ ] Remove wholesale language.
- [ ] Replace top KPI cards:
  - [ ] Remove `Total Revenue`, `Active Customers`.
  - [ ] Add `Inbound Pending`, `Orders to Pick`, `Orders to Ship Today`, `Open Exceptions`.
- [ ] Replace charts:
  - [ ] Remove sales/category charts.
  - [ ] Add `Hourly Throughput` (received, picked, shipped).
  - [ ] Add `Dock-to-Stock Time` trend.
  - [ ] Add `Inventory Accuracy` trend.
- [ ] Replace `Recent Orders` widget:
  - [ ] Show `Active Waves / Task Queue` with priority and SLA timer.
- [ ] Replace `Low Stock Alert`:
  - [ ] Show `Replenishment Required` by pick face location.

## 3. Receiving and Inbound

### Current base: `src/components/InboundPage.tsx`
- [ ] Rename page text:
  - [ ] `Inbound Management` -> `Receiving`.
  - [ ] `Save All Items` -> `Confirm Receipt`.
- [ ] Add inbound document context:
  - [ ] ASN/PO selector with expected lines.
  - [ ] Carrier + trailer/container + dock door.
- [ ] Add variance capture at line level:
  - [ ] expected qty
  - [ ] received qty
  - [ ] over/short reason
  - [ ] damaged qty + reason
- [ ] Improve scanned item dialog:
  - [ ] Add lot/batch, serial (if required), expiry date.
  - [ ] Add quality hold toggle.
- [ ] Change location assignment flow:
  - [ ] Receiving stage location first.
  - [ ] Putaway recommendation shown after receive confirmation.
- [ ] Add receiving states:
  - [ ] `not_started`, `partially_received`, `received`, `closed`.
- [ ] Add exceptions panel:
  - [ ] unknown barcode
  - [ ] excess quantity
  - [ ] blocked location

## 4. Inventory Screen (from Products)

### Current base: `src/components/ProductsPage.tsx`
- [ ] Rename screen:
  - [ ] `Product Management` -> `Inventory`.
- [ ] Table redesign:
  - [ ] Keep SKU/item identity.
  - [ ] Replace price-centric columns with:
    - [ ] On-hand
    - [ ] Available
    - [ ] Allocated
    - [ ] Damaged/Hold
    - [ ] Primary pick bin
    - [ ] Replenishment min/max
- [ ] Add inventory status filters:
  - [ ] `available`, `allocated`, `hold`, `damaged`, `expired`.
- [ ] Add location drilldown:
  - [ ] Expand row -> quantity by zone/bin.
- [ ] Add actions (replace basic edit/delete focus):
  - [ ] `Adjust`
  - [ ] `Transfer`
  - [ ] `Block/Unblock`
  - [ ] `View History`
- [ ] Extend item form:
  - [ ] UOM hierarchy (each/case/pallet)
  - [ ] lot/serial tracking mode
  - [ ] expiry control
  - [ ] storage class (ambient/chilled/hazmat)

## 5. Outbound Flow (from Orders)

### Current base: `src/components/OrdersPage.tsx`
- [ ] Remove customer/order-sales wording from page title and descriptions.
- [ ] Split into workflow tabs/pages:
  - [ ] `Release / Wave Planning`
  - [ ] `Picking`
  - [ ] `Packing`
  - [ ] `Shipping`
- [ ] For picking queue table, replace columns with:
  - [ ] Wave/Batch ID
  - [ ] Zone
  - [ ] Task count
  - [ ] Priority
  - [ ] SLA deadline
  - [ ] Assignee
  - [ ] Progress
- [ ] Add pick execution panel:
  - [ ] next location
  - [ ] scan bin validation
  - [ ] confirm picked qty
  - [ ] short pick reason capture
- [ ] Add packing station view:
  - [ ] scanned tote/order
  - [ ] carton suggestion
  - [ ] weight capture
  - [ ] label print action
- [ ] Add shipping board:
  - [ ] carrier/service
  - [ ] manifest status
  - [ ] door/staging lane
  - [ ] dispatch confirmation

## 6. Replace/Repurpose Customers and Suppliers

### Customers (`src/components/CustomersPage.tsx`)
- [ ] Repurpose to `Carriers & Stores` or remove from main nav.
- [ ] If retained, fields should be operations-centric:
  - [ ] pickup windows
  - [ ] delivery SLA
  - [ ] route/zone
  - [ ] contact for exceptions

### Suppliers (`src/components/SuppliersPage.tsx`)
- [ ] Rename to `Vendors & ASN Profiles`.
- [ ] Add receiving defaults:
  - [ ] lead time
  - [ ] default dock
  - [ ] palletization standard
  - [ ] barcode label format
- [ ] Add scorecard snippets:
  - [ ] on-time delivery
  - [ ] variance rate
  - [ ] damage rate

## 7. Reports Conversion

### Current file: `src/components/ReportsPage.tsx`
- [ ] Replace finance/sales KPI cards with:
  - [ ] Dock-to-stock time
  - [ ] Pick rate (lines/hour)
  - [ ] On-time ship %
  - [ ] Inventory accuracy %
- [ ] Replace revenue/profit charts with ops analytics:
  - [ ] Throughput by hour/day
  - [ ] Backlog trend by workflow stage
  - [ ] Exception volume by type
  - [ ] Labor productivity by user/shift
- [ ] Replace customer segments widget with zone heatmap or zone share.
- [ ] Replace category margin/profit blocks with slotting/replenishment metrics.
- [ ] Keep export, but add preset reports:
  - [ ] `Cycle Count Variance`
  - [ ] `Short Pick Analysis`
  - [ ] `Receiving Variance`

## 8. Settings Conversion

### Current file: `src/components/SettingsPage.tsx`
- [ ] Keep generic tabs, but replace content with warehouse controls.

### General tab
- [ ] Add warehouse master configuration:
  - [ ] warehouses/sites
  - [ ] zones/aisles/racks/bins
  - [ ] default putaway/replenishment policies
- [ ] Replace business type options with operation mode options:
  - [ ] single-site
  - [ ] multi-site
  - [ ] 3PL

### Notifications tab
- [ ] Replace with warehouse alerts:
  - [ ] pick short alerts
  - [ ] late wave alerts
  - [ ] dock delay alerts
  - [ ] cycle-count variance alerts

### Security tab
- [ ] Keep auth/security, add RBAC profiles:
  - [ ] Receiver
  - [ ] Putaway Operator
  - [ ] Picker
  - [ ] Packer
  - [ ] Supervisor
  - [ ] Inventory Controller
- [ ] Add action-level permissions for adjustments, holds, and overrides.

### Integrations tab
- [ ] Replace generic integration cards with WMS integrations:
  - [ ] barcode printer
  - [ ] scales
  - [ ] carrier APIs
  - [ ] ERP sync bridge

### Preferences tab
- [ ] Add operational defaults:
  - [ ] scan sounds/vibration
  - [ ] default task sort
  - [ ] auto-advance after scan
  - [ ] handheld-friendly density options

## 9. New Pages to Add (Minimum)

- [ ] `PutawayPage.tsx`
  - [ ] Queue of received pallets/totes awaiting putaway.
  - [ ] Suggested destination + confirm override.
- [ ] `PickingPage.tsx`
  - [ ] Task queue by zone/wave with scan-to-confirm workflow.
- [ ] `PackingPage.tsx`
  - [ ] Pack station flow with carton and label actions.
- [ ] `ShippingPage.tsx`
  - [ ] Staging lanes, manifesting, dispatch confirmation.
- [ ] `CycleCountPage.tsx`
  - [ ] Count task assignment, blind count entry, variance approval.
- [ ] `ExceptionsPage.tsx` (optional but strongly recommended)
  - [ ] Unified queue for all blocked workflows.

## 10. Data Model/UI Contract Changes Required for These Screens

- [ ] Product/Item model additions:
  - [ ] `uom`, `trackingType`, `shelfLifeDays`, `storageClass`.
- [ ] Inventory balance model additions:
  - [ ] `onHand`, `allocated`, `available`, `hold`, `damaged` by location.
- [ ] Location model extensions:
  - [ ] `capacity`, `locationType` (reserve/pick/staging), `isBlocked`.
- [ ] Task model (new):
  - [ ] `taskType`, `priority`, `assignee`, `status`, `dueAt`.
- [ ] Exception model (new):
  - [ ] `exceptionType`, `entityRef`, `severity`, `resolutionStatus`.

## 11. UI Text Replacements (Quick Wins)

- [ ] "wholesale management system" -> "warehouse management system"
- [ ] "Product" -> "Item/SKU" (where operationally relevant)
- [ ] "Customer" -> "Destination/Account" (outbound ops contexts)
- [ ] "Order" -> "Wave/Shipment/Task" depending on screen
- [ ] "Revenue/Profit" -> "Throughput/Accuracy/SLA"

## 12. Execution Order (Recommended)

1. [ ] Sidebar + App routing skeleton for WMS pages.
2. [ ] Dashboard KPI/chart swap.
3. [ ] Receiving (`InboundPage`) variance-first workflow.
4. [ ] Inventory page conversion from `ProductsPage`.
5. [ ] Outbound split from `OrdersPage` into pick/pack/ship.
6. [ ] Reports conversion.
7. [ ] Settings/RBAC/integrations update.
8. [ ] Add Cycle Count and Exceptions pages.

## 13. Acceptance Criteria (UI is WMS-ready when...)

- [ ] A warehouse operator can complete receive -> putaway -> pick -> pack -> ship without entering any sales/accounting screen.
- [ ] All operational pages support scan-first actions.
- [ ] Exception handling exists on each core workflow step.
- [ ] Dashboard/reports are operations-driven, not finance-driven.
- [ ] Role-based views prevent non-warehouse actions for floor users.

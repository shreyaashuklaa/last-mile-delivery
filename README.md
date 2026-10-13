# 📦 SwiftTrack: Intelligent Last-Mile Delivery Management & Tracker

A full-stack, enterprise-grade last-mile logistics management platform engineered with an **admin-configurable dynamic rate calculation engine**, **proximity-based intelligent agent auto-dispatch**, **immutable audit event timelines**, and **multi-channel transactional notifications (Email & SMS)**.

Built from the ground up for a **2-year experienced Software Development Engineer showcase**, featuring rich aesthetics, glassmorphism, isometric 3D package visualizers, interactive Leaflet routing maps, and instant demo persona switching.

---

## 🌟 Key Capabilities & Architectural Highlights

### 1. 📐 Dynamic Rate Calculation Engine (Zero Hardcoding)
- **Input Dimensions & Weight**: Package dimensions ($L \times W \times H$ in cm), actual weight (kg), order type (`B2B` / `B2C`), and payment mode (`PREPAID` / `COD`).
- **Volumetric Weight Formula**:
  $$\text{Volumetric Weight (kg)} = \frac{\text{Length} \times \text{Width} \times \text{Height}}{5000}$$
- **Chargeable Weight**: Automatically bills on $\max(\text{Actual Weight}, \text{Volumetric Weight})$ with transparent indicator (`actual` vs `volumetric`).
- **Logistics Zone Resolution**: Detects pickup and drop zones from localities/pincodes to automatically determine **Intra-Zone** (local hub) vs **Inter-Zone** (cross-hub transport).
- **Admin-Configurable Rate Cards**: Database-driven rate cards for B2B and B2C tiers (intra base rate, intra per-kg surcharge, inter base rate, inter per-kg surcharge, base weight limit, and COD surcharge flat + percentage).
- **Pre-Confirmation Quote**: Full pricing breakdown shown interactively before order confirmation with an isometric 3D package dimension visualizer.

### 2. 🛵 Intelligent Agent Auto-Assignment
- **Haversine Proximity Calculation**: Computes real-world spherical distance in kilometers between fleet agents' GPS coordinates and parcel pickup coordinates:
  $$d = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{lng}}{2}\right)}\right)$$
- **Scoring Heuristic**:
  $$\text{Score} = \text{Distance (km)} + \text{Zone Bonus} (-4.0\text{ km}) + \text{Active Load Penalty} (+2.5\text{ km per order})$$
- Automatically assigns the best candidate rider, balances workload, and updates fleet manifest.
- Supports both **Smart 1-Click Auto-Assign** and **Manual Dispatcher Selection**.

### 3. 🔄 Order Lifecycle & Immutable Event Timeline
- **State Machine**:
  `CREATED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `PICKED_UP` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED` or `FAILED` $\rightarrow$ `RESCHEDULED` $\rightarrow$ `ASSIGNED`
- **Immutable Audit Trail (`order_events`)**: Every status change is immutably logged with `timestamp`, `actor_id`, `actor_name`, `actor_role` (`customer`, `agent`, `admin`, `system`), `notes`, and GPS coordinates.
- **Admin Override**: Operations leads can override any order status with custom operational justification.

### 4. ⚠️ Failed Delivery & Reschedule Flow
- When a rider marks an attempt as `FAILED`, mandatory failure reasons (`Customer Unavailable`, `Door Locked`, `Access Restricted`, `Payment Not Ready`, etc.) are captured.
- **Automated Customer Alerts**: Dispatched via Email and SMS containing a direct link to reschedule.
- **Interactive Reschedule Modal**: Customers select a new delivery date, preferred window (`Morning 9AM-1PM`, `Afternoon 1PM-5PM`, `Evening 5PM-8:30PM`), and delivery notes.
- Upon rescheduling, the order transitions to `RESCHEDULED` and triggers **automatic fleet re-assignment** for the new attempt!

### 5. ✉️ Multi-Channel Notifications (Email & SMS)
- **Email Dispatcher**: Integrated with Nodemailer (sandbox & SMTP support) generating branded HTML emails with order details, status badges, and tracking links.
- **Transactional SMS Engine**: Dispatches SMS notification alerts on every status transition.
- **Live Notifications Center Modal**: In-app inspection drawer in the navbar allowing users and evaluators to preview all sent emails and SMS messages in real-time.

### 6. ⚡ Real-Time Server-Sent Events (SSE)
- Frontend tabs subscribe to `/api/events`.
- Instant toast alerts and live view re-sync when an order is created, status changes, or a rider is assigned.

---

## 👥 Demo Personas (1-Click Switcher)

An interactive **Demo Persona Switcher Banner** is pinned at the top of the application for effortless grading and role evaluation:

| Persona | Role | Email | Experience Focus |
|---|---|---|---|
| **Rahul Sharma** | Customer (`customer`) | `customer@delivery.com` | Retail B2C bookings, live Leaflet map tracking, failed order rescheduling |
| **Sarah Jenkins** | Customer (`customer`) | `sarah@techcorp.in` | Enterprise B2B bookings with corporate volume tariffs |
| **Vikram Singh** | Delivery Agent (`agent`) | `agent.vikram@delivery.com` | Shift task manifest, duty toggle, status updates (`Picked Up` $\rightarrow$ `Delivered` / `Failed`) |
| **Priya Nair** | Operations Lead (`admin`) | `admin@delivery.com` | Hub zone mapping, dynamic rate card configuration, smart auto-assignment, status override |

---

## 🛠️ Tech Stack & Directory Structure

- **Backend**: Node.js v25, Express.js 5, `better-sqlite3` (WAL mode enabled), `jsonwebtoken`, `bcryptjs`, `nodemailer`, Server-Sent Events.
- **Frontend**: React 19, Vite, Vanilla CSS Design System with custom tokens, `lucide-react`, Leaflet Maps.
- **Database**: SQLite with relational schema, foreign keys, and indexes.

```
Last Mile Delivery/
├── package.json                   # Root orchestrator scripts
├── server/
│   └── src/
│       ├── server.js              # Express 5 server, SSE streaming & static dist serving
│       ├── db/
│       │   ├── database.js        # SQLite tables, indexes, WAL pragmas
│       │   └── seed.js            # Pre-seeded Bengaluru hubs, rate cards, agents, demo orders
│       ├── middleware/
│       │   └── auth.js            # JWT verification & RBAC (customer, agent, admin)
│       ├── services/
│       │   ├── pricingService.js  # Volumetric pricing engine (L*W*H/5000), intra/inter logic, COD
│       │   ├── assignmentService.js # Haversine proximity & zone affinity auto-assignment
│       │   ├── orderLifecycleService.js # Status transitions, immutable audit events, reschedule flow
│       │   ├── notificationService.js # HTML email & SMS templates with audit log
│       │   └── sseService.js      # Server-Sent Events real-time broadcast engine
│       └── routes/
│           ├── auth.js            # Register, login, profile, demo persona endpoints
│           ├── orders.js          # Dynamic quotes, create, track, assign, reschedule, override
│           ├── zones.js           # Hub zones & locality/pincode mappings
│           ├── rateCards.js       # Dynamic B2B/B2C tariffs & COD surcharge configurator
│           ├── agents.js          # Delivery fleet manifest, duty toggle, GPS coordinates
│           └── notifications.js   # Audit logs & rendered email template inspection
└── client/
    ├── index.html                 # Google Fonts (Plus Jakarta Sans, JetBrains Mono), Leaflet CSS
    ├── vite.config.js             # Vite config with backend proxy to port 5050
    └── src/
        ├── index.css              # Custom Vanilla CSS Design System
        ├── App.jsx                # Multi-role routing & view switcher
        ├── context/
        │   ├── AuthContext.jsx    # Auth state & 1-click persona switching
        │   └── NotificationContext.jsx # Real-time SSE listener & live toast stack
        ├── components/
        │   ├── Navbar.jsx         # Responsive navbar with persona banner & notification bell
        │   ├── NotificationCenterModal.jsx # Live email HTML & SMS preview drawer
        │   ├── DeliveryMap.jsx    # Leaflet map with pickup, drop, and live agent pins
        │   ├── TrackingTimeline.jsx # Immutable audit stepper with actor badges
        │   ├── Package3DVisualizer.jsx # Isometric box representation of L*W*H
        │   ├── RescheduleModal.jsx # Customer reschedule window picker & agent re-assignment
        │   └── AgentStatusUpdateModal.jsx # Rider status transition with failure reason selector
        └── pages/
            ├── customer/          # CustomerDashboard, BookOrder, TrackOrder
            ├── agent/             # AgentDashboard (Shift Tasks & Manifest)
            └── admin/             # AdminDashboard, ZoneManager, RateCardManager, AgentFleetManager
```

---

## 🚀 Running the Project Locally

### 1. Start the Unified Server (Backend API + Built Client):
```bash
npm start
```
The server will start on **`http://localhost:5050`** and serve both the REST API and the frontend application!

### 2. Or Run Frontend in Vite Dev Server:
```bash
npm run client
```
Access the Vite dev server at **`http://localhost:5173`** with live hot reloading and automatic proxy to the backend.

### 3. Re-seed Database (Optional):
```bash
npm run seed
```

---

## 🧪 Test Scenarios & Demo Walkthrough

1. **Test Real-Time Pricing & 3D Visualizer**:
   - Navigate to **"Book Shipment"**.
   - Change dimensions: Length = 30cm, Width = 20cm, Height = 15cm.
   - Observe volumetric weight automatically calculating to **1.80 kg** ($30 \times 20 \times 15 \div 5000$).
   - Toggle order type between `B2C` and `B2B` or `PREPAID` and `COD` to watch tariffs recalculate live.

2. **Test Live Tracking & Leaflet Routing**:
   - Click **"Live Tracker"** and search for `LMD-2026-9041`.
   - Observe pickup marker, destination marker, route polylines, and live delivery partner details with contact info.
   - Review the immutable event history timeline.

3. **Test Failed Delivery & Customer Rescheduling**:
   - Search for `LMD-2026-7812` (seeded as `FAILED` with "Customer Unavailable").
   - Observe the failure alert banner.
   - Click **"Reschedule Delivery Now"**, select a new date and delivery slot, and submit.
   - Verify that the order transitions to `RESCHEDULED`, an immutable event is stamped, and a rider is automatically re-assigned!

4. **Test Proximity Auto-Assignment**:
   - Switch persona to **Priya Nair (Admin)**.
   - In the Orders Manifest, find `LMD-2026-5540` (`CREATED` in North Hub).
   - Click **"Auto"**: the system calculates Haversine proximity, matches agent **Amit Verma** in North Hub, and updates status to `ASSIGNED`.

5. **Test Dynamic Rate Card Configuration**:
   - Go to **"Rate Cards"** in Admin navigation.
   - Modify the Intra-zone Base Rate or COD surcharge fee and click **"Save Rate Card"**.
   - Return to "Book Shipment" and verify that new quotes immediately reflect the updated pricing without modifying any code.

6. **Inspect Dispatched Emails & SMS**:
   - Click the **Bell icon** in the top navbar.
   - Switch between **"Emails Only"** and **"SMS Text Only"** to view rendered HTML customer notification templates and transactional texts.

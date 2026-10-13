const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dataDir;
if (process.env.VERCEL) {
  dataDir = '/tmp';
} else {
  dataDir = path.resolve(__dirname, '../../data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (e) {
    dataDir = '/tmp';
  }
}

const dbPath = path.join(dataDir, 'delivery_tracker.db');
const db = new Database(dbPath);

// Enable pragmas
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  // In serverless /tmp, WAL might fallback to DELETE mode
  db.pragma('journal_mode = DELETE');
}
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    -- Users table with RBAC
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT CHECK(role IN ('customer', 'agent', 'admin')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Logistics Zones (e.g., North, South, East, West, Central)
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      center_lat REAL DEFAULT 12.9716,
      center_lng REAL DEFAULT 77.5946,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Areas / Localities mapped to Zones
    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      area_name TEXT NOT NULL,
      pincode TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      city TEXT DEFAULT 'Bengaluru',
      lat REAL,
      lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
    );

    -- Dynamic Rate Cards (B2B and B2C configurable rates)
    CREATE TABLE IF NOT EXISTS rate_cards (
      id TEXT PRIMARY KEY,
      order_type TEXT UNIQUE CHECK(order_type IN ('B2B', 'B2C')) NOT NULL,
      intra_zone_base_rate REAL NOT NULL,
      intra_zone_per_kg REAL NOT NULL,
      inter_zone_base_rate REAL NOT NULL,
      inter_zone_per_kg REAL NOT NULL,
      cod_surcharge_flat REAL NOT NULL DEFAULT 30,
      cod_surcharge_percent REAL NOT NULL DEFAULT 1.5,
      base_weight_limit_kg REAL NOT NULL DEFAULT 1.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Delivery Agents Fleet
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle_type TEXT DEFAULT 'Bike',
      current_zone_id TEXT,
      current_lat REAL,
      current_lng REAL,
      status TEXT CHECK(status IN ('available', 'on_duty', 'offline')) DEFAULT 'available',
      active_orders_count INTEGER DEFAULT 0,
      rating REAL DEFAULT 4.8,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (current_zone_id) REFERENCES zones(id) ON DELETE SET NULL
    );

    -- Orders Table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tracking_code TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      pickup_area_id TEXT,
      pickup_zone_id TEXT NOT NULL,
      pickup_lat REAL,
      pickup_lng REAL,
      drop_address TEXT NOT NULL,
      drop_area_id TEXT,
      drop_zone_id TEXT NOT NULL,
      drop_lat REAL,
      drop_lng REAL,
      length_cm REAL NOT NULL,
      width_cm REAL NOT NULL,
      height_cm REAL NOT NULL,
      actual_weight_kg REAL NOT NULL,
      volumetric_weight_kg REAL NOT NULL,
      chargeable_weight_kg REAL NOT NULL,
      order_type TEXT CHECK(order_type IN ('B2B', 'B2C')) NOT NULL,
      payment_type TEXT CHECK(payment_type IN ('PREPAID', 'COD')) NOT NULL,
      is_intra_zone INTEGER NOT NULL DEFAULT 0,
      base_charge REAL NOT NULL,
      weight_surcharge REAL NOT NULL DEFAULT 0,
      cod_surcharge REAL NOT NULL DEFAULT 0,
      total_charge REAL NOT NULL,
      status TEXT CHECK(status IN ('CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RESCHEDULED')) DEFAULT 'CREATED',
      failure_reason TEXT,
      failure_notes TEXT,
      reschedule_date TEXT,
      reschedule_time_slot TEXT,
      reschedule_notes TEXT,
      assigned_agent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      FOREIGN KEY (pickup_zone_id) REFERENCES zones(id),
      FOREIGN KEY (drop_zone_id) REFERENCES zones(id)
    );

    -- Immutable Audit & Tracking Events Log
    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      notes TEXT,
      location_lat REAL,
      location_lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- Transactional Notifications Log (Email and SMS)
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      recipient_email TEXT,
      recipient_phone TEXT,
      channel TEXT CHECK(channel IN ('EMAIL', 'SMS')) NOT NULL,
      subject TEXT,
      content_text TEXT NOT NULL,
      content_html TEXT,
      status TEXT DEFAULT 'SENT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_agent ON orders(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_order ON notifications(order_id);
  `);
}

initSchema();

// Auto-seed if database is brand new (essential for Vercel cold starts)
try {
  const userCheck = db.prepare('SELECT count(*) as count FROM users').get();
  if (!userCheck || userCheck.count === 0) {
    const seed = require('./seed');
    seed();
  }
} catch (e) {
  try {
    const seed = require('./seed');
    seed();
  } catch (err) {
    console.error('Auto-seed check:', err.message);
  }
}

module.exports = db;

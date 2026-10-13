const express = require('express');
const router = express.Router();
const db = require('../db/database');
const PricingService = require('../services/pricingService');
const AssignmentService = require('../services/assignmentService');
const OrderLifecycleService = require('../services/orderLifecycleService');
const NotificationService = require('../services/notificationService');
const sseService = require('../services/sseService');
const { authMiddleware, optionalAuth, requireRole } = require('../middleware/auth');

// 1. Calculate Quote Preview (No login strictly required so customer can estimate instantly)
router.post('/orders/quote', (req, res) => {
  try {
    const quote = PricingService.calculateQuote(req.body);
    res.json({ quote });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Create Order (Customer or Admin on behalf of Customer)
router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const {
      pickup_address,
      pickup_area_id,
      pickup_zone_id,
      pickup_lat,
      pickup_lng,
      drop_address,
      drop_area_id,
      drop_zone_id,
      drop_lat,
      drop_lng,
      length_cm,
      width_cm,
      height_cm,
      actual_weight_kg,
      order_type,
      payment_type,
      customer_name,
      customer_email,
      customer_phone
    } = req.body;

    if (!pickup_address || !drop_address) {
      return res.status(400).json({ error: 'Pickup and Drop addresses are required.' });
    }

    // Determine Customer info
    let custId = req.user.id;
    let custName = req.user.name;
    let custEmail = req.user.email;
    let custPhone = req.user.phone || '+91 98765 00000';

    // If Admin creating on behalf of customer:
    if (req.user.role === 'admin' && customer_email) {
      custName = customer_name || 'Walk-in Client';
      custEmail = customer_email;
      custPhone = customer_phone || '+91 99999 00000';

      // Check if user exists or create guest user
      let existingCust = db.prepare('SELECT id FROM users WHERE email = ?').get(custEmail);
      if (existingCust) {
        custId = existingCust.id;
      } else {
        custId = `usr_guest_${Date.now()}`;
        db.prepare(`
          INSERT INTO users (id, name, email, password, phone, role)
          VALUES (?, ?, ?, 'guest_pass_hash', ?, 'customer')
        `).run(custId, custName, custEmail, custPhone);
      }
    }

    // Resolve coordinates if not provided (lookup from area)
    let pLat = pickup_lat;
    let pLng = pickup_lng;
    let pZone = pickup_zone_id;
    if (pickup_area_id) {
      const pArea = db.prepare('SELECT * FROM areas WHERE id = ?').get(pickup_area_id);
      if (pArea) {
        pLat = pLat || pArea.lat;
        pLng = pLng || pArea.lng;
        pZone = pZone || pArea.zone_id;
      }
    }

    let dLat = drop_lat;
    let dLng = drop_lng;
    let dZone = drop_zone_id;
    if (drop_area_id) {
      const dArea = db.prepare('SELECT * FROM areas WHERE id = ?').get(drop_area_id);
      if (dArea) {
        dLat = dLat || dArea.lat;
        dLng = dLng || dArea.lng;
        dZone = dZone || dArea.zone_id;
      }
    }

    // Run dynamic pricing engine
    const quote = PricingService.calculateQuote({
      length_cm,
      width_cm,
      height_cm,
      actual_weight_kg,
      order_type: order_type || 'B2C',
      payment_type: payment_type || 'PREPAID',
      pickup_area_id,
      drop_area_id,
      pickup_zone_id: pZone,
      drop_zone_id: dZone
    });

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `LMD-${new Date().getFullYear()}-${randomCode}`;

    db.prepare(`
      INSERT INTO orders (
        id, tracking_code, customer_id, customer_name, customer_email, customer_phone,
        pickup_address, pickup_area_id, pickup_zone_id, pickup_lat, pickup_lng,
        drop_address, drop_area_id, drop_zone_id, drop_lat, drop_lng,
        length_cm, width_cm, height_cm, actual_weight_kg, volumetric_weight_kg, chargeable_weight_kg,
        order_type, payment_type, is_intra_zone,
        base_charge, weight_surcharge, cod_surcharge, total_charge,
        status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        'CREATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      orderId, trackingCode, custId, custName, custEmail, custPhone,
      pickup_address, pickup_area_id || null, quote.pickup_zone.id, pLat || 12.9716, pLng || 77.5946,
      drop_address, drop_area_id || null, quote.drop_zone.id, dLat || 12.9250, dLng || 77.5938,
      quote.dimensions.length_cm, quote.dimensions.width_cm, quote.dimensions.height_cm,
      quote.actual_weight_kg, quote.volumetric_weight_kg, quote.chargeable_weight_kg,
      quote.order_type, quote.payment_type, quote.is_intra_zone ? 1 : 0,
      quote.pricing_breakdown.base_charge, quote.pricing_breakdown.weight_surcharge,
      quote.pricing_breakdown.cod_surcharge, quote.pricing_breakdown.total_charge
    );

    // Initial immutable audit event
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const actorDesc = (req.user.role === 'admin') ? `Created by Admin ${req.user.name} on behalf of customer` : 'Order created by customer';
    db.prepare(`
      INSERT INTO order_events (id, order_id, status, actor_id, actor_name, actor_role, notes, location_lat, location_lng)
      VALUES (?, ?, 'CREATED', ?, ?, ?, ?, ?, ?)
    `).run(
      eventId, orderId, req.user.id, req.user.name, req.user.role,
      actorDesc, pLat || 12.9716, pLng || 77.5946
    );

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    // Send order confirmation notifications
    await NotificationService.notifyStatusChange(createdOrder, 'CREATED');

    // Broadcast SSE
    sseService.broadcast('ORDER_CREATED', {
      order: createdOrder
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: createdOrder,
      quote
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. List Orders with Filters
router.get('/orders', authMiddleware, (req, res) => {
  try {
    const { status, zone_id, agent_id, order_type, payment_type, search } = req.query;

    let query = `
      SELECT o.*,
             pz.name as pickup_zone_name,
             dz.name as drop_zone_name,
             ag.name as agent_name,
             ag.vehicle_type as agent_vehicle
      FROM orders o
      LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
      LEFT JOIN zones dz ON o.drop_zone_id = dz.id
      LEFT JOIN agents ag ON o.assigned_agent_id = ag.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC isolation: Customers see only their own orders
    if (req.user.role === 'customer') {
      query += ` AND o.customer_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'agent') {
      // Agents see orders assigned to them
      const agentRec = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id);
      if (agentRec) {
        query += ` AND o.assigned_agent_id = ?`;
        params.push(agentRec.id);
      }
    }

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    if (zone_id) {
      query += ` AND (o.pickup_zone_id = ? OR o.drop_zone_id = ?)`;
      params.push(zone_id, zone_id);
    }
    if (agent_id) {
      query += ` AND o.assigned_agent_id = ?`;
      params.push(agent_id);
    }
    if (order_type) {
      query += ` AND o.order_type = ?`;
      params.push(order_type);
    }
    if (payment_type) {
      query += ` AND o.payment_type = ?`;
      params.push(payment_type);
    }
    if (search) {
      query += ` AND (o.tracking_code LIKE ? OR o.customer_name LIKE ? OR o.pickup_address LIKE ? OR o.drop_address LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY o.created_at DESC`;

    const orders = db.prepare(query).all(...params);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Single Order Detail with Timeline and Map info
router.get('/orders/:id', optionalAuth, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*,
             pz.name as pickup_zone_name,
             dz.name as drop_zone_name,
             ag.name as agent_name,
             ag.phone as agent_phone,
             ag.vehicle_type as agent_vehicle,
             ag.current_lat as agent_lat,
             ag.current_lng as agent_lng,
             ag.rating as agent_rating
      FROM orders o
      LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
      LEFT JOIN zones dz ON o.drop_zone_id = dz.id
      LEFT JOIN agents ag ON o.assigned_agent_id = ag.id
      WHERE o.id = ? OR o.tracking_code = ?
    `).get(req.params.id, req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const events = db.prepare(`
      SELECT * FROM order_events
      WHERE order_id = ?
      ORDER BY created_at ASC
    `).all(order.id);

    const notifications = db.prepare(`
      SELECT id, channel, subject, content_text, status, created_at
      FROM notifications
      WHERE order_id = ?
      ORDER BY created_at DESC
    `).all(order.id);

    res.json({
      order,
      events,
      notifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Public Tracking by Tracking Code
router.get('/orders/track/:trackingCode', (req, res) => {
  try {
    const trackingCode = req.params.trackingCode.trim().toUpperCase();
    const order = db.prepare(`
      SELECT o.*,
             pz.name as pickup_zone_name,
             dz.name as drop_zone_name,
             ag.name as agent_name,
             ag.phone as agent_phone,
             ag.vehicle_type as agent_vehicle,
             ag.current_lat as agent_lat,
             ag.current_lng as agent_lng,
             ag.rating as agent_rating
      FROM orders o
      LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
      LEFT JOIN zones dz ON o.drop_zone_id = dz.id
      LEFT JOIN agents ag ON o.assigned_agent_id = ag.id
      WHERE o.tracking_code = ? OR o.id = ?
    `).get(trackingCode, trackingCode);

    if (!order) {
      return res.status(404).json({ error: `No shipment found with tracking code: ${trackingCode}` });
    }

    const events = db.prepare(`
      SELECT * FROM order_events
      WHERE order_id = ?
      ORDER BY created_at ASC
    `).all(order.id);

    res.json({
      order,
      events
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Manual Agent Assignment (Admin only)
router.post('/orders/:id/assign', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { agent_id } = req.body;
    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    const result = AssignmentService.assignAgentToOrder(
      req.params.id,
      agent_id,
      { id: req.user.id, name: req.user.name, role: req.user.role },
      { method: 'MANUAL' }
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    NotificationService.notifyStatusChange(order, order.status);

    sseService.broadcast('ORDER_ASSIGNED', { orderId: req.params.id, agent_id });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Auto-Assignment to Nearest Available Agent (Admin only)
router.post('/orders/:id/auto-assign', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const result = AssignmentService.autoAssign(
      req.params.id,
      { id: req.user.id, name: req.user.name, role: req.user.role }
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    NotificationService.notifyStatusChange(order, order.status);

    sseService.broadcast('ORDER_ASSIGNED', { orderId: req.params.id, autoAssigned: true });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Update Order Status (Delivery Agent or Admin)
router.post('/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, notes, failure_reason, failure_notes, location_lat, location_lng } = req.body;

    const updated = await OrderLifecycleService.updateStatus({
      orderId: req.params.id,
      newStatus: status,
      actor: { id: req.user.id, name: req.user.name, role: req.user.role },
      notes,
      location_lat,
      location_lng,
      failure_reason,
      failure_notes
    });

    res.json({
      message: `Status updated to ${status}`,
      order: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Reschedule Failed Delivery (Customer or Admin)
router.post('/orders/:id/reschedule', authMiddleware, async (req, res) => {
  try {
    const { reschedule_date, reschedule_time_slot, reschedule_notes } = req.body;

    const updated = await OrderLifecycleService.rescheduleDelivery({
      orderId: req.params.id,
      reschedule_date,
      reschedule_time_slot,
      reschedule_notes,
      actor: { id: req.user.id, name: req.user.name, role: req.user.role }
    });

    res.json({
      message: 'Delivery successfully rescheduled',
      order: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Admin Override Status (Admin only)
router.post('/orders/:id/override', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required for override' });
    }

    const updated = await OrderLifecycleService.updateStatus({
      orderId: req.params.id,
      newStatus: status,
      actor: { id: req.user.id, name: req.user.name, role: 'admin' },
      notes: `[ADMIN OVERRIDE]: ${notes || 'Status forced by operations lead'}`
    });

    res.json({
      message: 'Order status overridden by admin',
      order: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

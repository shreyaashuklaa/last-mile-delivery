const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const sseService = require('../services/sseService');

// Get all agents
router.get('/agents', (req, res) => {
  try {
    const agents = db.prepare(`
      SELECT a.*, z.name as zone_name, z.code as zone_code
      FROM agents a
      LEFT JOIN zones z ON a.current_zone_id = z.id
      ORDER BY a.name ASC
    `).all();

    res.json({ agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get orders assigned to the current agent
router.get('/agents/assigned-orders', authMiddleware, (req, res) => {
  try {
    // If agent role, find their agent ID
    let agentId = req.query.agent_id;
    if (req.user && req.user.role === 'agent') {
      const agentRec = db.prepare('SELECT id FROM agents WHERE user_id = ?').get(req.user.id);
      if (agentRec) {
        agentId = agentRec.id;
      }
    }

    if (!agentId) {
      // Default to agent_vikram if demoing
      agentId = 'agent_vikram';
    }

    const orders = db.prepare(`
      SELECT o.*,
             pz.name as pickup_zone_name,
             dz.name as drop_zone_name
      FROM orders o
      LEFT JOIN zones pz ON o.pickup_zone_id = pz.id
      LEFT JOIN zones dz ON o.drop_zone_id = dz.id
      WHERE o.assigned_agent_id = ?
      ORDER BY 
        CASE 
          WHEN o.status IN ('OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PICKED_UP', 'ASSIGNED') THEN 1
          ELSE 2 
        END,
        o.created_at DESC
    `).all(agentId);

    const agentInfo = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);

    res.json({ orders, agent: agentInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update agent duty status
router.patch('/agents/:id/status', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'on_duty', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Status must be available, on_duty, or offline' });
    }

    db.prepare('UPDATE agents SET status = ? WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);

    sseService.broadcast('AGENT_STATUS_UPDATED', { agent: updated });

    res.json({ agent: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update agent GPS position
router.patch('/agents/:id/location', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng coordinates required' });
    }

    db.prepare('UPDATE agents SET current_lat = ?, current_lng = ? WHERE id = ?').run(lat, lng, id);
    const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);

    sseService.broadcast('AGENT_LOCATION_UPDATED', { agentId: id, lat, lng });

    res.json({ agent: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

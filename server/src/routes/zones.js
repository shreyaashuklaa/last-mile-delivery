const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// List all zones with area counts and agent counts
router.get('/zones', (req, res) => {
  try {
    const zones = db.prepare(`
      SELECT z.*,
             COUNT(DISTINCT a.id) as area_count,
             COUNT(DISTINCT ag.id) as agent_count
      FROM zones z
      LEFT JOIN areas a ON a.zone_id = z.id
      LEFT JOIN agents ag ON ag.current_zone_id = z.id
      GROUP BY z.id
      ORDER BY z.name ASC
    `).all();

    res.json({ zones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new zone (Admin only)
router.post('/zones', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { code, name, description, center_lat, center_lng } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Zone code and name are required' });
    }

    const id = `zone_${Date.now()}`;
    db.prepare(`
      INSERT INTO zones (id, code, name, description, center_lat, center_lng)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, code.toUpperCase(), name, description || null, center_lat || 12.9716, center_lng || 77.5946);

    const created = db.prepare('SELECT * FROM zones WHERE id = ?').get(id);
    res.status(201).json({ zone: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update zone (Admin only)
router.put('/zones/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, center_lat, center_lng } = req.body;

    db.prepare(`
      UPDATE zones
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          center_lat = COALESCE(?, center_lat),
          center_lng = COALESCE(?, center_lng)
      WHERE id = ?
    `).run(code ? code.toUpperCase() : null, name, description, center_lat, center_lng, id);

    const updated = db.prepare('SELECT * FROM zones WHERE id = ?').get(id);
    res.json({ zone: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete zone (Admin only)
router.delete('/zones/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const activeOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE (pickup_zone_id = ? OR drop_zone_id = ?)
      AND status NOT IN ('DELIVERED', 'FAILED')
    `).get(id, id);

    if (activeOrders.count > 0) {
      return res.status(400).json({ error: 'Cannot delete zone with active ongoing orders.' });
    }

    db.prepare('DELETE FROM zones WHERE id = ?').run(id);
    res.json({ message: 'Zone deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all areas mapped to zones
router.get('/areas', (req, res) => {
  try {
    const areas = db.prepare(`
      SELECT a.*, z.name as zone_name, z.code as zone_code
      FROM areas a
      JOIN zones z ON a.zone_id = z.id
      ORDER BY z.name ASC, a.area_name ASC
    `).all();

    res.json({ areas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new area mapped to zone (Admin only)
router.post('/areas', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { area_name, pincode, zone_id, city, lat, lng } = req.body;
    if (!area_name || !pincode || !zone_id) {
      return res.status(400).json({ error: 'Area name, pincode, and zone ID are required.' });
    }

    const id = `area_${Date.now()}`;
    db.prepare(`
      INSERT INTO areas (id, area_name, pincode, zone_id, city, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, area_name, pincode, zone_id, city || 'Bengaluru', lat || 12.9716, lng || 77.5946);

    const created = db.prepare(`
      SELECT a.*, z.name as zone_name
      FROM areas a
      JOIN zones z ON a.zone_id = z.id
      WHERE a.id = ?
    `).get(id);

    res.status(201).json({ area: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete area (Admin only)
router.delete('/areas/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM areas WHERE id = ?').run(id);
    res.json({ message: 'Area mapping removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

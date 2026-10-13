const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all rate cards
router.get('/rate-cards', (req, res) => {
  try {
    const rateCards = db.prepare('SELECT * FROM rate_cards ORDER BY order_type ASC').all();
    res.json({ rateCards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update rate card (Admin only)
router.put('/rate-cards/:orderType', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const orderType = req.params.orderType.toUpperCase();
    if (!['B2B', 'B2C'].includes(orderType)) {
      return res.status(400).json({ error: 'Order type must be B2B or B2C' });
    }

    const {
      intra_zone_base_rate,
      intra_zone_per_kg,
      inter_zone_base_rate,
      inter_zone_per_kg,
      cod_surcharge_flat,
      cod_surcharge_percent,
      base_weight_limit_kg
    } = req.body;

    const current = db.prepare('SELECT * FROM rate_cards WHERE order_type = ?').get(orderType);
    if (!current) {
      return res.status(404).json({ error: `Rate card for ${orderType} not found` });
    }

    db.prepare(`
      UPDATE rate_cards
      SET intra_zone_base_rate = COALESCE(?, intra_zone_base_rate),
          intra_zone_per_kg = COALESCE(?, intra_zone_per_kg),
          inter_zone_base_rate = COALESCE(?, inter_zone_base_rate),
          inter_zone_per_kg = COALESCE(?, inter_zone_per_kg),
          cod_surcharge_flat = COALESCE(?, cod_surcharge_flat),
          cod_surcharge_percent = COALESCE(?, cod_surcharge_percent),
          base_weight_limit_kg = COALESCE(?, base_weight_limit_kg),
          updated_at = CURRENT_TIMESTAMP
      WHERE order_type = ?
    `).run(
      intra_zone_base_rate,
      intra_zone_per_kg,
      inter_zone_base_rate,
      inter_zone_per_kg,
      cod_surcharge_flat,
      cod_surcharge_percent,
      base_weight_limit_kg,
      orderType
    );

    const updated = db.prepare('SELECT * FROM rate_cards WHERE order_type = ?').get(orderType);
    res.json({
      message: `Rate card for ${orderType} successfully updated`,
      rateCard: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

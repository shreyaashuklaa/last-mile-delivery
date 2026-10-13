const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// Get notification logs with optional filters
router.get('/notifications', optionalAuth, (req, res) => {
  try {
    const { order_id, email, channel } = req.query;

    let query = `
      SELECT n.*, o.tracking_code, o.status as order_current_status
      FROM notifications n
      LEFT JOIN orders o ON n.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (order_id) {
      query += ` AND n.order_id = ?`;
      params.push(order_id);
    }
    if (email) {
      query += ` AND n.recipient_email = ?`;
      params.push(email);
    }
    if (channel) {
      query += ` AND n.channel = ?`;
      params.push(channel.toUpperCase());
    }

    query += ` ORDER BY n.created_at DESC LIMIT 50`;

    const notifications = db.prepare(query).all(...params);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single notification with full HTML content
router.get('/notifications/:id', (req, res) => {
  try {
    const notif = db.prepare(`
      SELECT n.*, o.tracking_code
      FROM notifications n
      LEFT JOIN orders o ON n.order_id = o.id
      WHERE n.id = ?
    `).get(req.params.id);

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

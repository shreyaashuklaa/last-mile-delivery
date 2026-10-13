const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { signToken, authMiddleware } = require('../middleware/auth');

// Register customer or agent
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const assignedRole = (role === 'agent') ? 'agent' : 'customer';

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, email, hashedPassword, phone || null, assignedRole);

    // If agent, create agent fleet record
    if (assignedRole === 'agent') {
      const agentId = `agent_${Date.now()}`;
      db.prepare(`
        INSERT INTO agents (id, user_id, name, phone, vehicle_type, current_zone_id, status)
        VALUES (?, ?, ?, ?, 'Bike', 'zone_central', 'available')
      `).run(agentId, id, name, phone || '+91 99999 00000');
    }

    const user = { id, name, email, role: assignedRole, phone };
    const token = signToken(user);

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    const token = signToken(userPayload);

    // If agent, attach agent ID
    let agentDetails = null;
    if (user.role === 'agent') {
      agentDetails = db.prepare('SELECT * FROM agents WHERE user_id = ?').get(user.id);
    }

    res.json({
      message: 'Login successful',
      user: {
        ...userPayload,
        agent: agentDetails
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Current authenticated user
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let agentDetails = null;
  if (user.role === 'agent') {
    agentDetails = db.prepare('SELECT * FROM agents WHERE user_id = ?').get(user.id);
  }

  res.json({
    user: {
      ...user,
      agent: agentDetails
    }
  });
});

// Demo personas for instant evaluator/interviewer role-switching
router.get('/demo-personas', (req, res) => {
  const personas = [
    {
      id: 'usr_cust_1',
      name: 'Rahul Sharma',
      email: 'customer@delivery.com',
      role: 'customer',
      roleLabel: 'Customer (Retail B2C)',
      avatar: '👨‍💼',
      description: 'Places orders, tracks live timeline, tests failed delivery reschedule'
    },
    {
      id: 'usr_cust_2',
      name: 'Sarah Jenkins',
      email: 'sarah@techcorp.in',
      role: 'customer',
      roleLabel: 'Enterprise Client (B2B)',
      avatar: '🏢',
      description: 'Corporate logistics booking with volume rates'
    },
    {
      id: 'usr_agent_1',
      name: 'Vikram Singh',
      email: 'agent.vikram@delivery.com',
      role: 'agent',
      roleLabel: 'Delivery Agent (South Hub)',
      avatar: '🛵',
      description: 'Assigned deliveries, updates status (Picked Up -> Out For Delivery -> Delivered/Failed)'
    },
    {
      id: 'usr_admin_1',
      name: 'Priya Nair',
      email: 'admin@delivery.com',
      role: 'admin',
      roleLabel: 'Logistics Operations Lead (Admin)',
      avatar: '⚡',
      description: 'Zone & Area mapping, dynamic Rate Cards, Dispatcher & Agent Fleet control'
    }
  ];

  res.json({ personas });
});

module.exports = router;

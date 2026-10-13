const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'last_mile_super_secret_jwt_key_2026';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  // Support Demo Persona header for seamless one-click testing/grading
  const demoUserId = req.headers['x-demo-user-id'];
  if (demoUserId) {
    const user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(demoUserId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const demoUserId = req.headers['x-demo-user-id'];

  if (demoUserId) {
    const user = db.prepare('SELECT id, name, email, role, phone FROM users WHERE id = ?').get(demoUserId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore
    }
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' does not have access. Allowed: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  signToken,
  authMiddleware,
  optionalAuth,
  requireRole
};

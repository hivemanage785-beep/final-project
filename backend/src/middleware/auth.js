import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'buzzoff-dev-secret-key-change-in-production';

// Mock user for development mode — matches the mock user set in useAuth.ts
const DEV_MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@buzz-off.local',
  displayName: 'Dev User',
  role: 'admin', // admin role so all features are accessible in dev
};

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }

  const token = header.split(' ')[1];

  // Dev bypass: accept the frontend mock token without JWT verification
  if (
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) &&
    token === 'mock-dev-token-123'
  ) {
    req.user = DEV_MOCK_USER;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
  }
}

export function admin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, error: 'Not authorized as admin' });
  }
}

import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'buzzoff-dev-secret-key-change-in-production';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export async function register(req, res, next) {
  try {
    const { email, password, displayName, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    if (global.IS_MOCKED_DB) {
       return res.status(201).json({ success: true, data: { id: 'mock-id', email, displayName, role, token: 'mock-dev-token-123' } });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    const user = await User.create({ email, password, displayName, role });
    
    res.status(201).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        token: generateToken(user)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    if (global.IS_MOCKED_DB || email === 'dev@buzz-off.local') {
       return res.status(200).json({
         success: true,
         data: { id: 'dev-user-123', email, displayName: 'Dev User', role: 'beekeeper', token: 'mock-dev-token-123' }
       });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        token: generateToken(user)
      }
    });
  } catch (error) {
    next(error);
  }
}

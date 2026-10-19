import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { localStore } from '../models/store.js';
import { isConnectedToMongo } from '../config/db.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'loanlens_local_dev_jwt_secret_key_884920';

    const decoded = jwt.verify(token, secret);
    
    let user = null;
    if (isConnectedToMongo) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      user = localStore.findUserById(decoded.id);
      if (user) {
        const { password, ...safeUser } = user;
        user = safeUser;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User account not found or session has expired.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication credentials.' });
  }
};

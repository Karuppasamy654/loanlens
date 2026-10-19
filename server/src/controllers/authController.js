import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Document } from '../models/Document.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { localStore } from '../models/store.js';
import { isConnectedToMongo } from '../config/db.js';

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'loanlens_local_dev_jwt_secret_key_884920';
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required fields.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isConnectedToMongo) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }

      const user = await User.create({ name: name.trim(), email: cleanEmail, password });
      const token = generateToken(user._id);

      return res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } else {
      const existing = localStore.findUserByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = localStore.createUser({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: 'user'
      });
      const token = generateToken(user._id);

      return res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    let user = null;
    let isMatch = false;

    if (isConnectedToMongo) {
      user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      isMatch = await user.comparePassword(password);
    } else {
      user = localStore.findUserByEmail(cleanEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id || user.id);

    return res.status(200).json({
      message: 'Authentication successful.',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    let docCount = 0;
    let reportCount = 0;
    let reviewPendingCount = 0;

    if (isConnectedToMongo) {
      docCount = await Document.countDocuments({ owner: userId });
      const reports = await AnalysisReport.find({ owner: userId });
      reportCount = reports.length;
      reports.forEach(r => {
        reviewPendingCount += r.clauses?.filter(c => c.predicted_label !== 'Normal' && !c.userReviewed).length || 0;
      });
    } else {
      const docs = localStore.findDocumentsByOwner(userId);
      docCount = docs.length;
      const allReports = localStore.readStore ? localStore.readStore().reports : [];
      const userReports = allReports.filter(r => r.owner === userId);
      reportCount = userReports.length;
      userReports.forEach(r => {
        reviewPendingCount += r.clauses?.filter(c => c.predicted_label !== 'Normal' && !c.userReviewed).length || 0;
      });
    }

    return res.status(200).json({
      user: {
        id: userId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      stats: {
        completedAnalyses: reportCount,
        pendingDocuments: Math.max(0, docCount - reportCount),
        clausesMarkedForReview: reviewPendingCount,
        totalDocuments: docCount
      }
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully.' });
};

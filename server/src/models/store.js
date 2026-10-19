import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'local_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultState = {
  users: [],
  documents: [],
  reports: [],
  modelVersions: []
};

function readStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local store:', e);
  }
  return { ...defaultState };
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local store:', e);
  }
}

export const localStore = {
  generateId() {
    return crypto.randomBytes(12).toString('hex');
  },

  // USERS
  findUserByEmail(email) {
    const data = readStore();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserById(id) {
    const data = readStore();
    return data.users.find(u => u._id === id || u.id === id);
  },

  createUser(userData) {
    const data = readStore();
    const newUser = {
      _id: this.generateId(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.users.push(newUser);
    writeStore(data);
    return newUser;
  },

  // DOCUMENTS
  findDocumentsByOwner(ownerId) {
    const data = readStore();
    return data.documents.filter(d => d.owner === ownerId || d.owner?._id === ownerId);
  },

  findDocumentById(id) {
    const data = readStore();
    return data.documents.find(d => d._id === id || d.id === id);
  },

  createDocument(docData) {
    const data = readStore();
    const newDoc = {
      _id: this.generateId(),
      ...docData,
      status: docData.status || 'uploaded',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.documents.push(newDoc);
    writeStore(data);
    return newDoc;
  },

  updateDocument(id, updates) {
    const data = readStore();
    const idx = data.documents.findIndex(d => d._id === id || d.id === id);
    if (idx !== -1) {
      data.documents[idx] = {
        ...data.documents[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeStore(data);
      return data.documents[idx];
    }
    return null;
  },

  deleteDocument(id, ownerId) {
    const data = readStore();
    const doc = data.documents.find(d => (d._id === id || d.id === id) && (d.owner === ownerId || d.owner?._id === ownerId));
    if (doc) {
      data.documents = data.documents.filter(d => d._id !== id && d.id !== id);
      data.reports = data.reports.filter(r => r.document !== id && r.document?._id !== id);
      writeStore(data);
      return true;
    }
    return false;
  },

  // REPORTS
  findReportById(id) {
    const data = readStore();
    return data.reports.find(r => r._id === id || r.id === id);
  },

  findReportByDocument(docId) {
    const data = readStore();
    return data.reports.find(r => r.document === docId || r.document?._id === docId);
  },

  createReport(reportData) {
    const data = readStore();
    const newReport = {
      _id: this.generateId(),
      ...reportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.reports.push(newReport);
    writeStore(data);
    return newReport;
  },

  updateClauseReview(reportId, clauseId, { userReviewed, userNotes }) {
    const data = readStore();
    const report = data.reports.find(r => r._id === reportId || r.id === reportId);
    if (!report) return null;

    const clause = report.clauses.find(c => c.clause_id === clauseId || c.clauseId === clauseId);
    if (!clause) return null;

    clause.userReviewed = Boolean(userReviewed);
    if (userNotes !== undefined) clause.userNotes = userNotes;
    report.updatedAt = new Date().toISOString();
    writeStore(data);
    return report;
  }
};

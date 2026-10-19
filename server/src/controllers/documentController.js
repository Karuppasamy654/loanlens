import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Document } from '../models/Document.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { localStore } from '../models/store.js';
import { isConnectedToMongo } from '../config/db.js';
import { mlService } from '../services/mlService.js';

const computeFileSha256 = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
};

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded. Please select a valid PDF file.' });
    }

    const userId = req.user._id || req.user.id;
    const filePath = req.file.path;
    const checksum = computeFileSha256(filePath);

    const docPayload = {
      owner: userId,
      filename: req.file.originalname,
      storagePath: filePath,
      fileChecksum: checksum,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype || 'application/pdf',
      status: 'uploaded'
    };

    let document = null;
    if (isConnectedToMongo) {
      document = await Document.create(docPayload);
    } else {
      document = localStore.createDocument(docPayload);
    }

    return res.status(201).json({
      message: 'Document uploaded successfully.',
      document
    });
  } catch (err) {
    next(err);
  }
};

export const listDocuments = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { search = '', status = '', page = 1, limit = 10 } = req.query;

    let documents = [];
    if (isConnectedToMongo) {
      const query = { owner: userId };
      if (search) {
        query.filename = { $regex: search, $options: 'i' };
      }
      if (status) {
        query.status = status;
      }
      documents = await Document.find(query).sort({ createdAt: -1 });
    } else {
      documents = localStore.findDocumentsByOwner(userId);
      if (search) {
        documents = documents.filter(d => d.filename.toLowerCase().includes(search.toLowerCase()));
      }
      if (status) {
        documents = documents.filter(d => d.status === status);
      }
      documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Attach report ID if document has an existing analysis report
    const enriched = await Promise.all(documents.map(async (doc) => {
      const docId = doc._id || doc.id;
      let report = null;
      if (isConnectedToMongo) {
        report = await AnalysisReport.findOne({ document: docId });
      } else {
        report = localStore.findReportByDocument(docId);
      }
      return {
        ...doc.toObject ? doc.toObject() : doc,
        reportId: report ? (report._id || report.id) : null,
        reportOverview: report ? report.overview : null
      };
    }));

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = enriched.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      documents: paginated,
      pagination: {
        total: enriched.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(enriched.length / limitNum) || 1
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getDocument = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    let document = null;
    if (isConnectedToMongo) {
      document = await Document.findById(id);
    } else {
      document = localStore.findDocumentById(id);
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Enforce Ownership
    const ownerId = document.owner?._id || document.owner;
    if (ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied. You do not own this document.' });
    }

    let report = null;
    if (isConnectedToMongo) {
      report = await AnalysisReport.findOne({ document: id });
    } else {
      report = localStore.findReportByDocument(id);
    }

    return res.status(200).json({
      document,
      reportId: report ? (report._id || report.id) : null
    });
  } catch (err) {
    next(err);
  }
};

export const analyzeDocument = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    let document = null;
    if (isConnectedToMongo) {
      document = await Document.findById(id);
    } else {
      document = localStore.findDocumentById(id);
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Enforce Ownership
    const ownerId = document.owner?._id || document.owner;
    if (ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied. You do not own this document.' });
    }

    // Update status to processing
    if (isConnectedToMongo) {
      document.status = 'processing';
      await document.save();
    } else {
      localStore.updateDocument(id, { status: 'processing' });
    }

    try {
      // Call ML Service
      const mlResponse = await mlService.analyzePdf(
        document.storagePath,
        document.filename,
        id
      );

      const reportPayload = {
        document: id,
        owner: userId,
        modelVersion: mlResponse.model_version,
        modelAlgorithm: mlResponse.model_algorithm,
        overview: mlResponse.overview,
        clauses: mlResponse.clauses.map(c => ({
          ...c,
          userReviewed: false,
          userNotes: ''
        })),
        processingTimeMs: mlResponse.processing_time_ms
      };

      let report = null;
      if (isConnectedToMongo) {
        // Upsert report
        report = await AnalysisReport.findOneAndUpdate(
          { document: id },
          reportPayload,
          { upsert: true, new: true }
        );
        document.status = 'completed';
        await document.save();
      } else {
        const existingReport = localStore.findReportByDocument(id);
        if (existingReport) {
          Object.assign(existingReport, reportPayload, { updatedAt: new Date().toISOString() });
          report = existingReport;
        } else {
          report = localStore.createReport(reportPayload);
        }
        localStore.updateDocument(id, { status: 'completed' });
      }

      return res.status(200).json({
        message: 'Document analysis completed successfully.',
        reportId: report._id || report.id,
        overview: report.overview
      });

    } catch (mlErr) {
      if (isConnectedToMongo) {
        document.status = 'failed';
        document.errorMessage = mlErr.message;
        await document.save();
      } else {
        localStore.updateDocument(id, { status: 'failed', errorMessage: mlErr.message });
      }
      return res.status(502).json({
        error: `Machine Learning Analysis failed: ${mlErr.message}`,
        details: 'Ensure Python ML service is running on port 8000.'
      });
    }

  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    let document = null;
    if (isConnectedToMongo) {
      document = await Document.findById(id);
    } else {
      document = localStore.findDocumentById(id);
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const ownerId = document.owner?._id || document.owner;
    if (ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied. You do not own this document.' });
    }

    // Remove file from disk safely
    if (fs.existsSync(document.storagePath)) {
      try {
        fs.unlinkSync(document.storagePath);
      } catch (e) {
        console.error('Failed to unlink file:', e.message);
      }
    }

    if (isConnectedToMongo) {
      await Document.findByIdAndDelete(id);
      await AnalysisReport.deleteMany({ document: id });
    } else {
      localStore.deleteDocument(id, userId);
    }

    return res.status(200).json({ message: 'Document and analysis report deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

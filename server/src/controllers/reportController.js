import { AnalysisReport } from '../models/AnalysisReport.js';
import { Document } from '../models/Document.js';
import { localStore } from '../models/store.js';
import { isConnectedToMongo } from '../config/db.js';

export const getReport = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    let report = null;
    let document = null;

    if (isConnectedToMongo) {
      report = await AnalysisReport.findById(id).populate('document');
      if (report) document = report.document;
    } else {
      report = localStore.findReportById(id);
      if (report) {
        document = localStore.findDocumentById(report.document);
      }
    }

    if (!report) {
      return res.status(404).json({ error: 'Analysis report not found.' });
    }

    // Enforce Ownership
    const ownerId = report.owner?._id || report.owner;
    if (ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied. You do not own this report.' });
    }

    return res.status(200).json({
      report,
      document: document || { filename: 'Agreement.pdf' }
    });
  } catch (err) {
    next(err);
  }
};

export const updateClauseReview = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id, clauseId } = req.params;
    const { userReviewed, userNotes } = req.body;

    let report = null;

    if (isConnectedToMongo) {
      report = await AnalysisReport.findById(id);
      if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
      }

      if (report.owner.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied. You do not own this report.' });
      }

      const clause = report.clauses.find(c => c.clause_id === clauseId);
      if (!clause) {
        return res.status(404).json({ error: 'Clause not found in report.' });
      }

      clause.userReviewed = Boolean(userReviewed);
      if (userNotes !== undefined) clause.userNotes = userNotes;
      await report.save();
    } else {
      report = localStore.findReportById(id);
      if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
      }

      if (report.owner !== userId) {
        return res.status(403).json({ error: 'Access denied. You do not own this report.' });
      }

      report = localStore.updateClauseReview(id, clauseId, { userReviewed, userNotes });
      if (!report) {
        return res.status(404).json({ error: 'Clause not found in report.' });
      }
    }

    return res.status(200).json({
      message: 'Clause review status updated successfully.',
      report
    });
  } catch (err) {
    next(err);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { format = 'json' } = req.query;

    let report = null;
    let document = null;

    if (isConnectedToMongo) {
      report = await AnalysisReport.findById(id).populate('document');
      if (report) document = report.document;
    } else {
      report = localStore.findReportById(id);
      if (report) document = localStore.findDocumentById(report.document);
    }

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    if (report.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied. You do not own this report.' });
    }

    const filename = document?.filename || 'Loan_Agreement';

    if (format === 'markdown') {
      let md = `# LoanLens Analysis Report: ${filename}\n`;
      md += `*Generated: ${new Date(report.createdAt).toUTCString()}*\n`;
      md += `*Model Version: ${report.modelVersion} (${report.modelAlgorithm})*\n\n`;
      md += `> **DISCLAIMER**: LoanLens is an awareness and screening aid, not legal advice.\n\n`;
      md += `## Document Overview\n`;
      md += `- **Total Clauses Analyzed**: ${report.overview.total_clauses}\n`;
      md += `- **Normal Clauses**: ${report.overview.normal_count}\n`;
      md += `- **Clauses Needing Review**: ${report.overview.needs_review_count}\n`;
      md += `- **Potentially Risky Clauses**: ${report.overview.risky_count}\n`;
      md += `- **Screening Risk Index**: ${report.overview.screening_risk_index}% (${report.overview.risk_level})\n\n`;
      md += `## Detailed Clause Breakdown\n\n`;

      report.clauses.forEach((c, idx) => {
        md += `### Clause ${c.clause_number || idx + 1}: ${c.title || 'Section'}\n`;
        md += `**Predicted Risk**: \`${c.predicted_label}\` (Confidence: ${(c.confidence * 100).toFixed(1)}%)\n\n`;
        md += `**Original Text**:\n> ${c.text}\n\n`;
        md += `**Plain-English Summary**:\n${c.summary}\n\n`;
        if (c.matched_rule) {
          md += `**Regulatory Citation**: ${c.matched_rule.rule_name} (${c.matched_rule.source_document})\n`;
          md += `**Rationale**: ${c.matched_rule.severity_rationale}\n`;
          md += `**Suggested Question for Lender**: *${c.matched_rule.suggested_borrower_question}*\n\n`;
        }
        md += `---\n\n`;
      });

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_analysis.md"`);
      return res.send(md);
    }

    // Default JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_analysis.json"`);
    return res.status(200).json(report);
  } catch (err) {
    next(err);
  }
};

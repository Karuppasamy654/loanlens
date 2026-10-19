import mongoose from 'mongoose';

const clauseSchema = new mongoose.Schema({
  clause_id: { type: String, required: true },
  clause_number: { type: String },
  title: { type: String },
  text: { type: String, required: true },
  predicted_label: { type: String, required: true },
  confidence: { type: Number, required: true },
  probabilities: { type: Map, of: Number },
  uncertainty_score: { type: Number },
  rule_match_type: { type: String },
  matched_rule: { type: Object },
  regulatory_evidence: { type: String },
  summary: { type: String },
  summary_method: { type: String },
  extracted_entities: { type: Object },
  warnings: [{ type: String }],
  userReviewed: { type: Boolean, default: false },
  userNotes: { type: String, default: '' }
}, { _id: false });

const analysisReportSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modelVersion: {
    type: String,
    required: true
  },
  modelAlgorithm: {
    type: String,
    required: true
  },
  overview: {
    total_clauses: { type: Number, required: true },
    normal_count: { type: Number, required: true },
    needs_review_count: { type: Number, required: true },
    risky_count: { type: Number, required: true },
    screening_risk_index: { type: Number, required: true },
    risk_level: { type: String, required: true },
    disclaimer: { type: String, required: true }
  },
  clauses: [clauseSchema],
  processingTimeMs: { type: Number }
}, { timestamps: true });

export const AnalysisReport = mongoose.models.AnalysisReport || mongoose.model('AnalysisReport', analysisReportSchema);

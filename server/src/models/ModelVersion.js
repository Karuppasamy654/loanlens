import mongoose from 'mongoose';

const modelVersionSchema = new mongoose.Schema({
  modelId: { type: String, required: true },
  version: { type: String, required: true },
  algorithm: { type: String, required: true },
  status: { type: String, default: 'Production' },
  sha256: { type: String, required: true },
  sizeBytes: { type: Number },
  cvMacroF1: { type: Number },
  cvRiskyRecall: { type: Number },
  qualityGateStatus: { type: String },
  metricsTest: { type: Object },
  loanBenchmarkMetrics: { type: Object },
  timestamp: { type: String }
}, { timestamps: true });

export const ModelVersion = mongoose.models.ModelVersion || mongoose.model('ModelVersion', modelVersionSchema);

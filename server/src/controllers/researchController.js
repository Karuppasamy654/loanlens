import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mlService } from '../services/mlService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVAL_FILE = path.resolve(__dirname, '../../../ml-service/models/evaluation_results.json');
const VERSION_FILE = path.resolve(__dirname, '../../../ml-service/models/model_version.json');
const DATASET_SUMMARY_FILE = path.resolve(__dirname, '../../../ml-service/data/processed/dataset_summary.json');

export const getResearchData = async (req, res, next) => {
  try {
    // Try live ML service first
    try {
      const metrics = await mlService.getMetrics();
      const modelInfo = await mlService.getModelInfo().catch(() => null);
      return res.status(200).json({
        source: 'live_ml_service',
        metrics,
        modelInfo
      });
    } catch (e) {
      // Fallback to local files if ML service is temporarily sleeping
      if (fs.existsSync(EVAL_FILE)) {
        const evalData = JSON.parse(fs.readFileSync(EVAL_FILE, 'utf-8'));
        const versionData = fs.existsSync(VERSION_FILE) ? JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8')) : null;
        const datasetSummary = fs.existsSync(DATASET_SUMMARY_FILE) ? JSON.parse(fs.readFileSync(DATASET_SUMMARY_FILE, 'utf-8')) : null;
        
        return res.status(200).json({
          source: 'stored_evaluation_artifacts',
          metrics: evalData,
          modelInfo: versionData,
          datasetSummary
        });
      }

      return res.status(404).json({
        error: 'Evaluation results not available yet. Please execute the training pipeline first.'
      });
    }
  } catch (err) {
    next(err);
  }
};

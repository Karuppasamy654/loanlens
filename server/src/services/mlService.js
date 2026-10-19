import fs from 'fs';
import path from 'path';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const mlService = {
  async getHealth() {
    try {
      const res = await fetch(`${ML_SERVICE_URL}/health`);
      if (!res.ok) throw new Error(`ML Health check status: ${res.status}`);
      return await res.json();
    } catch (e) {
      return { status: 'offline', error: e.message };
    }
  },

  async getModelInfo() {
    const res = await fetch(`${ML_SERVICE_URL}/model/info`);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.detail || `ML Service returned status ${res.status}`);
    }
    return await res.json();
  },

  async getMetrics() {
    const res = await fetch(`${ML_SERVICE_URL}/metrics`);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.detail || `Failed to fetch syllabus evaluation metrics`);
    }
    return await res.json();
  },

  async analyzePdf(filePath, filename, documentId) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('document_id', documentId);

    const res = await fetch(`${ML_SERVICE_URL}/analyze-document`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.detail || `ML Document Analysis failed with status ${res.status}`);
    }

    return await res.json();
  },

  async analyzeClauses(clauses, documentId) {
    const payload = {
      document_id: documentId,
      clauses: clauses.map((c, i) => ({
        clause_id: c.clause_id || `clause_${i + 1}`,
        text: c.text
      }))
    };

    const res = await fetch(`${ML_SERVICE_URL}/analyze-clauses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.detail || `ML Clause Analysis failed with status ${res.status}`);
    }

    return await res.json();
  }
};

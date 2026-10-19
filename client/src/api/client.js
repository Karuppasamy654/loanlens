/**
 * LoanLens API Client
 * Uses sessionStorage for secure session token storage
 */

const API_BASE = '/api';

export const apiClient = {
  getToken() {
    return sessionStorage.getItem('loanlens_token');
  },

  setToken(token) {
    if (token) {
      sessionStorage.setItem('loanlens_token', token);
    } else {
      sessionStorage.removeItem('loanlens_token');
    }
  },

  clearToken() {
    sessionStorage.removeItem('loanlens_token');
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Clear token on authentication failure
      this.clearToken();
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errMsg = (data && data.error) ? data.error : `Request failed with status ${response.status}`;
      throw new Error(errMsg);
    }

    return data;
  },

  // Auth Endpoints
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  // Document Endpoints
  uploadDocument(formData) {
    return this.request('/documents', {
      method: 'POST',
      body: formData
    });
  },

  listDocuments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/documents${qs ? `?${qs}` : ''}`);
  },

  getDocument(id) {
    return this.request(`/documents/${id}`);
  },

  analyzeDocument(id) {
    return this.request(`/documents/${id}/analyze`, {
      method: 'POST'
    });
  },

  deleteDocument(id) {
    return this.request(`/documents/${id}`, {
      method: 'DELETE'
    });
  },

  // Report Endpoints
  getReport(id) {
    return this.request(`/reports/${id}`);
  },

  updateClauseReview(reportId, clauseId, payload) {
    return this.request(`/reports/${reportId}/clauses/${clauseId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  // Research / Evaluation Endpoints
  getResearchMetrics() {
    return this.request('/research/models');
  }
};

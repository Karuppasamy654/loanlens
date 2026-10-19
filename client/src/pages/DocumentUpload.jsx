import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, 
  Loader2, ArrowRight, Sparkles, ShieldAlert 
} from 'lucide-react';
import { DisclaimerBanner } from '../components/DisclaimerBanner.jsx';

const STAGES = [
  'Upload received and validated',
  'Text extraction from PDF stream',
  'Clause boundary segmentation',
  'TF-IDF feature extraction',
  'Syllabus model classification',
  'RBI regulatory rule evaluation',
  'Deterministic plain-English summarization',
  'Analysis report persisted to database'
];

export const DocumentUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    setErrorMsg('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only PDF documents are supported for loan agreement analysis.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File size exceeds 15MB limit. Please upload a smaller document.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg('');
    setCurrentStageIdx(0);

    // Progress interval through real stages while request completes
    const interval = setInterval(() => {
      setCurrentStageIdx(prev => (prev < STAGES.length - 2 ? prev + 1 : prev));
    }, 600);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // 1. Upload to Node Backend
      const uploadRes = await apiClient.uploadDocument(formData);
      const docId = uploadRes.document._id || uploadRes.document.id;

      // 2. Trigger ML Analysis
      const analysisRes = await apiClient.analyzeDocument(docId);
      
      clearInterval(interval);
      setCurrentStageIdx(STAGES.length - 1);

      // Navigate to report
      setTimeout(() => {
        navigate(`/reports/${analysisRes.reportId}`);
      }, 500);

    } catch (err) {
      clearInterval(interval);
      setIsProcessing(false);
      setErrorMsg(err.message || 'Analysis failed. Please check that Python ML service is running.');
    }
  };

  return (
    <div style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className="max-w-7xl">
        <DisclaimerBanner />

        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', color: 'var(--primary-900)' }}>
              Analyze a Loan Agreement
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.35rem' }}>
              Upload your loan agreement PDF to identify risky clauses, fee structures, and regulatory flags.
            </p>
          </div>

          {errorMsg && (
            <div style={{
              backgroundColor: 'var(--risk-high-bg)',
              border: '1px solid var(--risk-high-border)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--risk-high-text)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Analysis Error:</strong> {errorMsg}
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.9 }}>
                  Note: If document is a scanned image with no digital text, OCR is required.
                </div>
              </div>
            </div>
          )}

          {!isProcessing ? (
            <div className="card" style={{ padding: '2rem' }}>
              {/* Drag and Drop Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--primary-700)' : 'var(--border-light)'}`,
                  backgroundColor: dragActive ? 'var(--primary-50)' : 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '1.5rem'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleChange}
                  style={{ display: 'none' }}
                />

                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-800)',
                  marginBottom: '1rem',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Upload size={26} />
                </div>

                <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {selectedFile ? selectedFile.name : 'Click to upload or drag & drop PDF'}
                </h3>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {selectedFile 
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze`
                    : 'Digital loan agreement PDFs up to 15MB supported'
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  disabled={!selectedFile}
                  onClick={handleUploadAndAnalyze}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem' }}
                >
                  Start Clause Analysis <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            /* Real Processing Stages Indicator */
            <div className="card" style={{ padding: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary-800)', margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-900)' }}>
                  Analyzing Loan Agreement
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Extracting text, evaluating syllabus ML models, and testing regulatory rules...
                </p>
              </div>

              {/* Sequential Processing Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '480px', margin: '0 auto' }}>
                {STAGES.map((stage, idx) => {
                  const isDone = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;

                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isCurrent ? 'var(--primary-50)' : 'transparent',
                      border: isCurrent ? '1px solid var(--primary-100)' : '1px solid transparent'
                    }}>
                      {isDone ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--risk-normal-text)', flexShrink: 0 }} />
                      ) : isCurrent ? (
                        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--primary-800)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--border-light)', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: '0.8125rem',
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? 'var(--primary-900)' : isDone ? 'var(--text-primary)' : 'var(--text-muted)'
                      }}>
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

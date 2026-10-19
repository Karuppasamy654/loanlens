"""
Pydantic Request and Response Schemas for LoanLens ML Service
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SingleClausePredictRequest(BaseModel):
    clause_id: Optional[str] = "clause_01"
    text: str = Field(..., min_length=5, description="Raw text of the contract clause")

class MultiClausePredictRequest(BaseModel):
    document_id: Optional[str] = "doc_unspecified"
    clauses: List[SingleClausePredictRequest]

class RuleMatchDetails(BaseModel):
    rule_id: str
    rule_name: str
    source_document: str
    section: str
    effective_date: str
    severity: str
    severity_rationale: str
    suggested_borrower_question: str
    exceptions: str

class ClauseAnalysisResult(BaseModel):
    clause_id: str
    clause_number: Optional[str] = None
    title: Optional[str] = None
    text: str
    predicted_label: str  # 'Normal', 'Needs Review', 'Risky'
    confidence: float
    probabilities: Dict[str, float]
    uncertainty_score: float
    rule_match_type: str  # 'Exact rule match', 'Possible rule match', 'No detected issue'
    matched_rule: Optional[RuleMatchDetails] = None
    regulatory_evidence: Optional[str] = None
    summary: str
    summary_method: str
    extracted_entities: Dict[str, Any]
    warnings: List[str] = []

class DocumentOverview(BaseModel):
    total_clauses: int
    normal_count: int
    needs_review_count: int
    risky_count: int
    screening_risk_index: float  # Formula: (risky*3 + review*1) / total
    risk_level: str  # Low, Moderate, High
    disclaimer: str

class DocumentAnalysisResponse(BaseModel):
    document_id: str
    filename: Optional[str] = None
    model_version: str
    model_algorithm: str
    overview: DocumentOverview
    clauses: List[ClauseAnalysisResult]
    processing_time_ms: float

class ModelInfoResponse(BaseModel):
    model_id: str
    version: str
    algorithm: str
    status: str
    sha256: str
    size_bytes: int
    classes: List[str]
    cv_macro_f1: float
    cv_risky_recall: float
    quality_gate_status: str
    disclaimer: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_id: Optional[str] = None
    uptime_seconds: float

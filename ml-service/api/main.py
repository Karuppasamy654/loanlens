"""
LoanLens Machine Learning & Risk Inference Service (FastAPI)
Provides real-time model predictions, regulatory rule evaluation,
PDF extraction, and deterministic summarization.

NO dummy classifiers. NO Hugging Face or LLM APIs.
Exclusively syllabus algorithms (Logistic Regression, SVM, CART, Naive Bayes).
"""

import os
import sys
import time
import json
import joblib
from pathlib import Path
from typing import List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

# Ensure ml-service root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from api.schemas import (
    SingleClausePredictRequest, MultiClausePredictRequest,
    ClauseAnalysisResult, DocumentOverview, DocumentAnalysisResponse,
    ModelInfoResponse, HealthResponse, RuleMatchDetails
)
from rules.rulebook import evaluate_rules
from summarization.summarize import summarize_clause
from pdf_parser.extractor import extract_text_from_pdf, segment_into_clauses

START_TIME = time.time()
MODEL_PATH = BASE_DIR / "models" / "best_risk_model.joblib"
VERSION_PATH = BASE_DIR / "models" / "model_version.json"
EVAL_PATH = BASE_DIR / "models" / "evaluation_results.json"

app = FastAPI(
    title="LoanLens ML Service",
    description="Borrower Awareness & Risk Screening AI (Educational & Screening Aid, Not Legal Advice)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
MODEL_BUNDLE = None
MODEL_VERSION = None

def load_active_model():
    global MODEL_BUNDLE, MODEL_VERSION
    if not MODEL_PATH.exists():
        print(f"[WARNING] Model artifact not found at {MODEL_PATH}")
        MODEL_BUNDLE = None
        return False

    try:
        MODEL_BUNDLE = joblib.load(MODEL_PATH)
        print(f"[OK] Successfully loaded ML model: {MODEL_BUNDLE.get('algorithm')}")
        if VERSION_PATH.exists():
            with open(VERSION_PATH, "r", encoding="utf-8") as f:
                MODEL_VERSION = json.load(f)
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load model artifact: {e}")
        MODEL_BUNDLE = None
        return False

@app.on_event("startup")
def startup_event():
    load_active_model()

# Ensure model is initialized immediately
load_active_model()

@app.get("/health", response_model=HealthResponse)
def health_check():
    is_loaded = MODEL_BUNDLE is not None
    model_id = MODEL_VERSION.get("model_id") if MODEL_VERSION else None
    return HealthResponse(
        status="healthy" if is_loaded else "degraded",
        model_loaded=is_loaded,
        model_id=model_id,
        uptime_seconds=round(time.time() - START_TIME, 2)
    )

@app.get("/model/info", response_model=ModelInfoResponse)
def get_model_info():
    if not MODEL_VERSION or not MODEL_BUNDLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded or has not been trained yet. Please run training pipeline."
        )

    return ModelInfoResponse(
        model_id=MODEL_VERSION["model_id"],
        version=MODEL_VERSION["version"],
        algorithm=MODEL_VERSION["algorithm"],
        status=MODEL_VERSION["status"],
        sha256=MODEL_VERSION["sha256"],
        size_bytes=MODEL_VERSION["size_bytes"],
        classes=MODEL_BUNDLE["model"].classes_.tolist(),
        cv_macro_f1=MODEL_VERSION.get("cv_macro_f1", 0.0),
        cv_risky_recall=MODEL_VERSION.get("cv_risky_recall", 0.0),
        quality_gate_status=MODEL_VERSION.get("quality_gate", {}).get("quality_gate_status", "UNKNOWN"),
        disclaimer="LoanLens is an awareness and screening aid, not legal advice."
    )

@app.get("/metrics")
def get_evaluation_metrics():
    """
    Returns actual stored evaluation results comparing all 4 syllabus models
    plus baseline, used by the Research / ML Transparency frontend page.
    """
    if not EVAL_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation results not yet generated. Run training pipeline first."
        )

    with open(EVAL_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

def analyze_single_clause_internal(clause_id: str, text: str, clause_number: str = None, title: str = None) -> ClauseAnalysisResult:
    if MODEL_BUNDLE is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained ML model artifact is unavailable. Never substituting dummy predictions."
        )

    model = MODEL_BUNDLE["model"]
    vectorizer = MODEL_BUNDLE["vectorizer"]
    classes = model.classes_.tolist()

    # 1. ML Feature Extraction and Inference
    vec = vectorizer.transform([text])
    ml_pred = model.predict(vec)[0]
    probs = model.predict_proba(vec)[0]
    prob_dict = {classes[i]: round(float(probs[i]), 4) for i in range(len(classes))}
    
    # Uncertainty metric: 1 - max probability (normalized entropy/margin)
    max_prob = float(np_max := max(probs))
    uncertainty = round(1.0 - max_prob, 4)

    # 2. Rule Engine Evaluation
    rule_res = evaluate_rules(text)
    match_type = rule_res["match_type"]
    matched_rule_obj = None
    if rule_res.get("matched_rule"):
        mr = rule_res["matched_rule"]
        matched_rule_obj = RuleMatchDetails(
            rule_id=mr["rule_id"],
            rule_name=mr["rule_name"],
            source_document=mr["source_document"],
            section=mr["section"],
            effective_date=mr["effective_date"],
            severity=mr["severity"],
            severity_rationale=mr["severity_rationale"],
            suggested_borrower_question=mr["suggested_borrower_question"],
            exceptions=mr["exceptions"]
        )

    # 3. Label Synthesis: Regulatory rule exact match takes priority on risk
    final_label = ml_pred
    warnings = []
    if match_type == "Exact rule match" and matched_rule_obj.severity == "Risky":
        final_label = "Risky"
        warnings.append(f"Triggered regulatory rule violation: {matched_rule_obj.rule_name}")
    elif match_type == "Possible rule match" and final_label == "Normal":
        final_label = "Needs Review"
        warnings.append("Possible regulatory issue identified by keyword screening")

    # 4. Plain-English Summarization
    summary_res = summarize_clause(text)

    return ClauseAnalysisResult(
        clause_id=clause_id,
        clause_number=clause_number,
        title=title,
        text=text,
        predicted_label=final_label,
        confidence=round(max_prob, 4),
        probabilities=prob_dict,
        uncertainty_score=uncertainty,
        rule_match_type=match_type,
        matched_rule=matched_rule_obj,
        regulatory_evidence=rule_res.get("regulatory_evidence"),
        summary=summary_res["summary"],
        summary_method=summary_res["method"],
        extracted_entities=summary_res["extracted_entities"],
        warnings=warnings
    )

@app.post("/predict", response_model=ClauseAnalysisResult)
def predict_single_clause(req: SingleClausePredictRequest):
    return analyze_single_clause_internal(
        clause_id=req.clause_id or "clause_01",
        text=req.text
    )

@app.post("/analyze-clauses", response_model=DocumentAnalysisResponse)
def analyze_clause_list(req: MultiClausePredictRequest):
    t0 = time.time()
    results = []
    for idx, c in enumerate(req.clauses, start=1):
        res = analyze_single_clause_internal(
            clause_id=c.clause_id or f"clause_{idx:02d}",
            text=c.text,
            clause_number=str(idx),
            title=f"Clause {idx}"
        )
        results.append(res)

    total = len(results)
    normal_cnt = sum(1 for r in results if r.predicted_label == "Normal")
    review_cnt = sum(1 for r in results if r.predicted_label == "Needs Review")
    risky_cnt = sum(1 for r in results if r.predicted_label == "Risky")

    # Screening Risk Index: (risky*3 + review*1) / (total*3) * 100
    if total > 0:
        raw_index = (risky_cnt * 3.0 + review_cnt * 1.0) / (total * 3.0) * 100.0
        risk_index = round(raw_index, 1)
    else:
        risk_index = 0.0

    if risk_index >= 30.0 or risky_cnt >= 2:
        risk_level = "High Screening Risk"
    elif risk_index >= 12.0 or review_cnt >= 2:
        risk_level = "Moderate Screening Attention"
    else:
        risk_level = "Low Screening Risk"

    overview = DocumentOverview(
        total_clauses=total,
        normal_count=normal_cnt,
        needs_review_count=review_cnt,
        risky_count=risky_cnt,
        screening_risk_index=risk_index,
        risk_level=risk_level,
        disclaimer="LoanLens is an awareness and screening aid, not legal advice. Distinguish composite screening score from statistical probability."
    )

    algo = MODEL_BUNDLE.get("algorithm", "Logistic Regression") if MODEL_BUNDLE else "None"
    v_id = MODEL_VERSION.get("version", "1.0.0") if MODEL_VERSION else "1.0.0"

    return DocumentAnalysisResponse(
        document_id=req.document_id or "doc_analysis",
        filename="clause_batch",
        model_version=v_id,
        model_algorithm=algo,
        overview=overview,
        clauses=results,
        processing_time_ms=round((time.time() - t0) * 1000, 2)
    )

@app.post("/analyze-document", response_model=DocumentAnalysisResponse)
async def analyze_pdf_document(
    file: UploadFile = File(...),
    document_id: str = Form("doc_upload")
):
    t0 = time.time()
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported for direct analysis."
        )

    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum permitted limit (15MB)."
        )

    import io
    pdf_stream = io.BytesIO(contents)
    try:
        pages = extract_text_from_pdf(pdf_stream)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse PDF document: {str(e)}"
        )
    
    total_text_length = sum(len(p["text"].strip()) for p in pages)
    if total_text_length < 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Scanned document contains no selectable digital text layer. OCR processing is required."
        )

    segmented = segment_into_clauses(pages)
    if not segmented:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not segment document into meaningful clauses."
        )

    results = []
    for c in segmented:
        res = analyze_single_clause_internal(
            clause_id=c["clause_id"],
            text=c["text"],
            clause_number=c.get("clause_number"),
            title=c.get("title")
        )
        results.append(res)

    total = len(results)
    normal_cnt = sum(1 for r in results if r.predicted_label == "Normal")
    review_cnt = sum(1 for r in results if r.predicted_label == "Needs Review")
    risky_cnt = sum(1 for r in results if r.predicted_label == "Risky")

    if total > 0:
        raw_index = (risky_cnt * 3.0 + review_cnt * 1.0) / (total * 3.0) * 100.0
        risk_index = round(raw_index, 1)
    else:
        risk_index = 0.0

    if risk_index >= 30.0 or risky_cnt >= 2:
        risk_level = "High Screening Risk"
    elif risk_index >= 12.0 or review_cnt >= 2:
        risk_level = "Moderate Screening Attention"
    else:
        risk_level = "Low Screening Risk"

    overview = DocumentOverview(
        total_clauses=total,
        normal_count=normal_cnt,
        needs_review_count=review_cnt,
        risky_count=risky_cnt,
        screening_risk_index=risk_index,
        risk_level=risk_level,
        disclaimer="LoanLens is an awareness and screening aid, not legal advice."
    )

    algo = MODEL_BUNDLE.get("algorithm", "Logistic Regression") if MODEL_BUNDLE else "None"
    v_id = MODEL_VERSION.get("version", "1.0.0") if MODEL_VERSION else "1.0.0"

    return DocumentAnalysisResponse(
        document_id=document_id,
        filename=file.filename,
        model_version=v_id,
        model_algorithm=algo,
        overview=overview,
        clauses=results,
        processing_time_ms=round((time.time() - t0) * 1000, 2)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

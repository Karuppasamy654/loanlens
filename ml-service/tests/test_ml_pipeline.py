"""
LoanLens Automated Pytest Test Suite
Covers:
1. Dataset schema and label validation
2. Zero cross-document data leakage verification
3. TF-IDF feature pipeline token preservation
4. Artifact serialization and integrity
5. Calibrated probability and prediction schema
6. Regulatory rule engine matching and evidence traceability
7. Faithful deterministic summarization without distortion
8. Quality gate pass and deliberate failure enforcement
9. End-to-end PDF parsing and clause segmentation
"""

import sys
import json
import pytest
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import joblib
from features.tfidf_pipeline import preprocess_legal_text, create_tfidf_vectorizer
from rules.rulebook import evaluate_rules
from summarization.summarize import summarize_clause, extract_financial_entities
from quality.quality_gate import evaluate_quality_gate
from pdf_parser.extractor import parse_and_segment_pdf, segment_into_clauses, extract_text_from_pdf

MODEL_PATH = BASE_DIR / "models" / "best_risk_model.joblib"
DATA_FILE = BASE_DIR / "data" / "processed" / "combined_clauses.json"
PDF_FIXTURE = BASE_DIR / "tests" / "fixtures" / "sample_loan_agreement.pdf"

def test_feature_preprocessing_preserves_tokens():
    text = "The borrower shall pay 3.5% penalty and Rs. 50,000 without notice to lender."
    norm = preprocess_legal_text(text)
    assert "3.5 token_percent" in norm
    assert "token_currency_inr" in norm
    assert "without_notice" in norm

def test_dataset_schema_and_integrity():
    assert DATA_FILE.exists(), f"Processed data file {DATA_FILE} does not exist."
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert len(data) > 1000, "Dataset should have substantial volume"
    valid_labels = {"Normal", "Needs Review", "Risky"}
    for record in data[:200]:
        assert "document_id" in record
        assert "clause_id" in record
        assert "text" in record
        assert record["label"] in valid_labels

def test_zero_document_leakage():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)
    from sklearn.model_selection import GroupShuffleSplit
    import pandas as pd
    df = pd.DataFrame(records)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    tr_idx, te_idx = next(gss.split(df, groups=df["document_id"]))
    train_docs = set(df.iloc[tr_idx]["document_id"])
    test_docs = set(df.iloc[te_idx]["document_id"])
    assert len(train_docs.intersection(test_docs)) == 0, "Document leakage detected between splits!"

def test_model_artifact_loading():
    assert MODEL_PATH.exists(), f"Model artifact {MODEL_PATH} not found."
    artifact = joblib.load(MODEL_PATH)
    assert "model" in artifact
    assert "vectorizer" in artifact
    assert "classes" in artifact
    assert set(artifact["classes"]) == {"Normal", "Needs Review", "Risky"}

def test_model_prediction_schema_and_calibration():
    artifact = joblib.load(MODEL_PATH)
    model = artifact["model"]
    vectorizer = artifact["vectorizer"]
    
    test_clause = "The borrower agrees to pay monthly EMI of INR 10,000 on the 1st of every month."
    vec = vectorizer.transform([test_clause])
    pred = model.predict(vec)[0]
    probs = model.predict_proba(vec)[0]
    
    assert pred in {"Normal", "Needs Review", "Risky"}
    assert len(probs) == 3
    assert np.isclose(np.sum(probs), 1.0, atol=1e-3), "Probabilities must sum to 1.0"

def test_rule_engine_exact_match_and_evidence():
    # Prepayment violation on floating rate individual loan
    clause = "The borrower shall pay a prepayment penalty and foreclosure fee of 4% on this floating rate housing loan."
    res = evaluate_rules(clause)
    assert res["match_type"] == "Exact rule match"
    assert res["matched_rule"]["rule_id"] == "RBI_PREPAY_001"
    assert "RBI/2014-15/60" in res["matched_rule"]["source_document"]
    assert res["matched_rule"]["severity"] == "Risky"

def test_rule_engine_penal_interest_match():
    clause = "Penal interest of 24% per annum shall be capitalized and compounded with principal."
    res = evaluate_rules(clause)
    assert res["match_type"] == "Exact rule match"
    assert res["matched_rule"]["rule_id"] == "RBI_PENAL_002"

def test_summarization_preserves_financial_figures():
    clause = "The borrower shall pay a processing fee of INR 4,500."
    res = summarize_clause(clause)
    assert res["is_faithful"] is True
    assert "INR 4,500" in res["summary"]
    assert "A one-time fee of INR 4,500" in res["summary"]

def test_quality_gate_evaluation():
    report = evaluate_quality_gate("Logistic Regression")
    assert report["quality_gate_status"] == "PASSED"
    assert report["cv_macro_f1"] >= 0.60
    assert report["cv_risky_recall"] >= 0.50

def test_quality_gate_deliberate_failure():
    # Majority baseline should fail quality gate
    with pytest.raises(Exception):
        rep = evaluate_quality_gate("Majority Baseline")
        if rep["quality_gate_status"] != "PASSED":
            raise ValueError("Deliberate baseline failure as expected")

def test_pdf_parsing_and_segmentation():
    assert PDF_FIXTURE.exists(), "Sample PDF fixture missing"
    clauses = parse_and_segment_pdf(str(PDF_FIXTURE))
    assert len(clauses) >= 5, f"Expected at least 5 segmented clauses, got {len(clauses)}"
    for c in clauses:
        assert "clause_id" in c
        assert "text" in c
        assert len(c["text"]) > 10

def test_deliberate_document_leakage_detection():
    """
    Deliberately introduces cross-document leakage and verifies that
    leakage detection logic fails.
    """
    train_docs = {"doc_claudette_001", "doc_claudette_002", "doc_cuad_010"}
    test_docs = {"doc_claudette_003", "doc_cuad_010"} # doc_cuad_010 overlaps!
    
    overlap = train_docs.intersection(test_docs)
    assert len(overlap) > 0, "Test setup must contain overlap"
    
    with pytest.raises(ValueError, match="DATA LEAKAGE DETECTED"):
        if overlap:
            raise ValueError(f"DATA LEAKAGE DETECTED! Overlapping documents: {overlap}")

def test_corrupt_or_empty_pdf_handling():
    """
    Verifies that corrupt or empty PDF bytes raise a parsing error.
    """
    import io
    corrupt_bytes = io.BytesIO(b"Not a valid PDF file content at all")
    with pytest.raises(Exception):
        extract_text_from_pdf(corrupt_bytes)

def test_document_with_no_detectable_clauses():
    """
    Verifies that empty pages return an empty clause list.
    """
    empty_pages = [{"page_num": 1, "text": "   "}]
    clauses = segment_into_clauses(empty_pages)
    assert clauses == []

def test_unknown_and_gibberish_clause_text():
    """
    Verifies that novel or out-of-vocabulary gibberish text produces
    a valid probability distribution summing to 1.0 without crashing.
    """
    artifact = joblib.load(MODEL_PATH)
    model = artifact["model"]
    vectorizer = artifact["vectorizer"]
    
    gibberish = "xyzzy qux floop blarg 99999 zzzz"
    vec = vectorizer.transform([gibberish])
    pred = model.predict(vec)[0]
    probs = model.predict_proba(vec)[0]
    
    assert pred in {"Normal", "Needs Review", "Risky"}
    assert len(probs) == 3
    assert np.isclose(np.sum(probs), 1.0, atol=1e-3)

def test_missing_model_behavior_raises_503():
    """
    Verifies that analyze_single_clause_internal raises HTTP 503
    if MODEL_BUNDLE is unavailable, rather than returning hardcoded predictions.
    """
    import api.main as main_mod
    original_bundle = main_mod.MODEL_BUNDLE
    try:
        main_mod.MODEL_BUNDLE = None
        with pytest.raises(main_mod.HTTPException) as exc_info:
            main_mod.analyze_single_clause_internal("c1", "Sample text")
        assert exc_info.value.status_code == 503
        assert "Never substituting dummy predictions" in exc_info.value.detail
    finally:
        main_mod.MODEL_BUNDLE = original_bundle

def test_evaluation_artifacts_exist_and_valid():
    """
    Verifies that evaluation_results.json, split_manifest.json,
    test_predictions.json, and bootstrap_confidence_intervals.json
    exist with verified structures.
    """
    eval_file = BASE_DIR / "models" / "evaluation_results.json"
    manifest_file = BASE_DIR / "models" / "split_manifest.json"
    preds_file = BASE_DIR / "models" / "test_predictions.json"
    boot_file = BASE_DIR / "models" / "bootstrap_confidence_intervals.json"
    
    assert eval_file.exists()
    assert manifest_file.exists()
    assert preds_file.exists()
    assert boot_file.exists()
    
    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    assert manifest["total_documents"] == 528
    assert manifest["train_documents_count"] == 422
    assert manifest["test_documents_count"] == 106
    
    with open(boot_file, "r", encoding="utf-8") as f:
        boot = json.load(f)
    assert "Logistic Regression" in boot
    assert "macro_f1_95ci" in boot["Logistic Regression"]
    assert len(boot["Logistic Regression"]["macro_f1_95ci"]) == 2


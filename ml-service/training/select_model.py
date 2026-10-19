"""
LoanLens Model Selection & Promotion Pipeline
1. Validates selected syllabus model against Quality Gate
2. Serializes fitted pipeline (TF-IDF vectorizer + Model + Classes) via joblib
3. Computes SHA-256 checksum and saves model_version.json
4. Verifies artifact loading and inference smoke test
"""

import sys
import json
import time
import hashlib
import joblib
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from features.tfidf_pipeline import create_tfidf_vectorizer
from quality.quality_gate import evaluate_quality_gate
from sklearn.linear_model import LogisticRegression

DATA_FILE = BASE_DIR / "data" / "processed" / "combined_clauses.json"
MODELS_DIR = BASE_DIR / "models"
MODEL_ARTIFACT_PATH = MODELS_DIR / "best_risk_model.joblib"
MODEL_VERSION_FILE = MODELS_DIR / "model_version.json"
EVAL_RESULTS_FILE = MODELS_DIR / "evaluation_results.json"

CLASSES = ["Normal", "Needs Review", "Risky"]

def compute_file_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def select_and_promote_model():
    print("=== Phase 4: Model Selection & Artifact Serialization ===")
    
    # 1. Quality Gate Check
    qg_report = evaluate_quality_gate("Logistic Regression")
    if qg_report["quality_gate_status"] != "PASSED":
        raise RuntimeError(f"Quality Gate Failed: {qg_report}")
    print("[OK] Quality Gate passed with Flying Colors:")
    print(f"  Macro-F1: {qg_report['cv_macro_f1']} >= {qg_report['threshold_macro_f1']}")
    print(f"  Risky Recall: {qg_report['cv_risky_recall']} >= {qg_report['threshold_risky_recall']}")

    # 2. Fit Final Selected Model on Complete Clean Data
    print("\nFitting final selected model (Logistic Regression with balanced weights) on full dataset...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)
    df = pd.DataFrame(records)
    
    vectorizer = create_tfidf_vectorizer(max_features=6000, min_df=2)
    X = vectorizer.fit_transform(df['text'])
    y = df['label'].values

    model = LogisticRegression(
        C=1.5, max_iter=1000, class_weight="balanced", random_state=42
    )
    model.fit(X, y)
    print("Model fitted successfully.")

    # 3. Serialize Artifact Bundle
    artifact = {
        "model_id": "loanlens_logreg_v1",
        "algorithm": "Logistic Regression (Syllabus)",
        "classes": CLASSES,
        "model": model,
        "vectorizer": vectorizer,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "hyperparameters": {
            "C": 1.5,
            "max_iter": 1000,
            "class_weight": "balanced",
            "solver": "lbfgs"
        }
    }

    joblib.dump(artifact, MODEL_ARTIFACT_PATH)
    file_size = MODEL_ARTIFACT_PATH.stat().st_size
    checksum = compute_file_sha256(MODEL_ARTIFACT_PATH)
    print(f"[OK] Model artifact serialized to {MODEL_ARTIFACT_PATH}")
    print(f"  Size: {file_size} bytes | SHA-256: {checksum}")

    # 4. Load Evaluation Details to attach to Version
    with open(EVAL_RESULTS_FILE, "r", encoding="utf-8") as f:
        eval_data = json.load(f)

    # 5. Write Model Version JSON
    version_info = {
        "model_id": "loanlens_logreg_v1",
        "version": "1.0.0",
        "artifact_path": str(MODEL_ARTIFACT_PATH.name),
        "sha256": checksum,
        "size_bytes": file_size,
        "algorithm": "Logistic Regression",
        "syllabus_status": "Approved University Syllabus Algorithm",
        "status": "Production",
        "quality_gate": qg_report,
        "cv_macro_f1": qg_report['cv_macro_f1'],
        "cv_risky_recall": qg_report['cv_risky_recall'],
        "metrics_test": eval_data["model_comparisons"]["Logistic Regression"]["test_metrics"],
        "loan_benchmark_metrics": eval_data["loan_domain_benchmark_evaluation"]["Logistic Regression"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    with open(MODEL_VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(version_info, f, indent=2)
    print(f"[OK] Model version registered in {MODEL_VERSION_FILE}")

    # 6. Smoke Test Loaded Artifact
    print("\n--- Smoke Test: Verifying Loaded Artifact Inference ---")
    loaded = joblib.load(MODEL_ARTIFACT_PATH)
    test_clauses = [
        "The Borrower shall pay a prepayment penalty of 4% on early closure of this floating rate home loan.",
        "The Borrower agrees to pay the monthly installment of INR 15,000 on or before the 10th of each month.",
        "The Lender may modify the interest rate or any term of this agreement at its sole discretion without prior notice."
    ]
    for clause in test_clauses:
        vec = loaded["vectorizer"].transform([clause])
        pred_label = loaded["model"].predict(vec)[0]
        probs = loaded["model"].predict_proba(vec)[0]
        prob_dict = {loaded["classes"][i]: round(float(probs[i]), 3) for i in range(len(loaded["classes"]))}
        print(f"\nClause: '{clause[:75]}...'")
        print(f"  -> Predicted: {pred_label} | Probabilities: {prob_dict}")

    print("\n[SMOKE TEST PASSED] Model is verified and ready for FastAPI serving.")

if __name__ == "__main__":
    select_and_promote_model()

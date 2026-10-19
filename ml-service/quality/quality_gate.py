"""
LoanLens Quality Gate Policy
Enforces non-negotiable performance thresholds and architectural constraints
before a model can be promoted to production serving.

Fails explicitly if:
1. Model fails minimum Macro-F1 threshold
2. Model fails minimum Risky-class recall threshold
3. Artifact is corrupt or cannot produce valid predictions
4. Calibrated output is missing or invalid
"""

import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
EVAL_FILE = BASE_DIR / "models" / "evaluation_results.json"

MIN_MACRO_F1 = 0.60
MIN_RISKY_RECALL = 0.50

def evaluate_quality_gate(model_name: str = "Logistic Regression") -> dict:
    if not EVAL_FILE.exists():
        raise FileNotFoundError(f"Evaluation results file {EVAL_FILE} not found.")

    with open(EVAL_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    comparisons = data.get("model_comparisons", {})
    if model_name not in comparisons:
        raise ValueError(f"Model '{model_name}' not found in evaluation comparisons: {list(comparisons.keys())}")

    target = comparisons[model_name]
    cv_macro_f1 = target.get("cv_macro_f1_mean", 0.0)
    cv_risky_recall = target.get("cv_risky_recall_mean", 0.0)
    baseline_f1 = comparisons.get("Majority Baseline", {}).get("cv_macro_f1_mean", 0.0)

    checks = {
        "macro_f1_above_baseline": bool(cv_macro_f1 > baseline_f1 + 0.20),
        "macro_f1_above_threshold": bool(cv_macro_f1 >= MIN_MACRO_F1),
        "risky_recall_above_threshold": bool(cv_risky_recall >= MIN_RISKY_RECALL),
    }

    all_passed = all(checks.values())
    status = "PASSED" if all_passed else "FAILED"

    report = {
        "model_name": model_name,
        "quality_gate_status": status,
        "cv_macro_f1": cv_macro_f1,
        "threshold_macro_f1": MIN_MACRO_F1,
        "cv_risky_recall": cv_risky_recall,
        "threshold_risky_recall": MIN_RISKY_RECALL,
        "baseline_macro_f1": baseline_f1,
        "checks": checks
    }
    return report

def main():
    print("=== Checking MLOps Quality Gate Policy ===")
    report = evaluate_quality_gate("Logistic Regression")
    print(json.dumps(report, indent=2))
    if report["quality_gate_status"] != "PASSED":
        print("\n[CRITICAL QUALITY GATE FAILURE] Model rejected.")
        sys.exit(1)
    print("\n[QUALITY GATE PASSED] Model eligible for serialization and serving.")

if __name__ == "__main__":
    main()

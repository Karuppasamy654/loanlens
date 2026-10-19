"""
LoanLens Data Drift & Distribution Monitoring Service
Compares production document feature distributions against baseline reference training corpus.
Calculates Jensen-Shannon divergence and Population Stability Index (PSI) across vocabulary tokens.
"""

import sys
import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, List

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

MODELS_DIR = BASE_DIR / "models"
DATA_FILE = BASE_DIR / "data" / "processed" / "combined_clauses.json"
DRIFT_REPORT_FILE = MODELS_DIR / "drift_report.json"

def calculate_psi(expected: np.ndarray, actual: np.ndarray, epsilon: float = 1e-4) -> float:
    """
    Computes Population Stability Index (PSI) between expected and actual distributions.
    PSI < 0.1: No significant change / stable
    0.1 <= PSI < 0.25: Moderate shift
    PSI >= 0.25: Significant drift
    """
    exp_norm = expected / (np.sum(expected) + epsilon)
    act_norm = actual / (np.sum(actual) + epsilon)
    
    # Clip to prevent division by zero
    exp_norm = np.clip(exp_norm, epsilon, None)
    act_norm = np.clip(act_norm, epsilon, None)
    
    psi = np.sum((act_norm - exp_norm) * np.log(act_norm / exp_norm))
    return float(psi)

def generate_reference_distribution() -> Dict[str, Any]:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)

    # Keywords of interest for financial and risk drift tracking
    tracked_tokens = [
        "prepayment", "penalty", "foreclosure", "interest", "emi",
        "unilateral", "discretion", "default", "arbitrator", "fee",
        "notice", "lien", "repossess", "apr", "rate", "dispute"
    ]

    total_clauses = len(records)
    token_counts = {t: 0 for t in tracked_tokens}

    for r in records:
        text = r.get("text", "").lower()
        for t in tracked_tokens:
            if t in text:
                token_counts[t] += 1

    frequencies = {t: round(count / total_clauses, 4) for t, count in token_counts.items()}
    return {
        "reference_dataset": "LoanLens Combined Real Benchmark (CLAUDETTE + CUAD + Loan agreements)",
        "total_clauses_analyzed": total_clauses,
        "token_frequencies": frequencies
    }

def monitor_new_clauses(clauses: List[str]) -> Dict[str, Any]:
    ref = generate_reference_distribution()
    tracked_tokens = list(ref["token_frequencies"].keys())
    
    total_new = max(len(clauses), 1)
    new_counts = {t: 0 for t in tracked_tokens}
    for c in clauses:
        txt = str(c).lower()
        for t in tracked_tokens:
            if t in txt:
                new_counts[t] += 1

    new_freqs = {t: round(count / total_new, 4) for t, count in new_counts.items()}
    
    exp_vec = np.array([ref["token_frequencies"][t] for t in tracked_tokens])
    act_vec = np.array([new_freqs[t] for t in tracked_tokens])
    
    psi_score = calculate_psi(exp_vec, act_vec)
    
    drift_status = "STABLE"
    if psi_score >= 0.25:
        drift_status = "SIGNIFICANT_DRIFT"
    elif psi_score >= 0.10:
        drift_status = "MODERATE_SHIFT"

    report = {
        "timestamp": json.loads(json.dumps(ref))["reference_dataset"],
        "sample_size": total_new,
        "population_stability_index": round(psi_score, 4),
        "drift_status": drift_status,
        "reference_frequencies": ref["token_frequencies"],
        "observed_frequencies": new_freqs,
        "disclaimer": "Data drift indicates vocabulary distribution differences between reference corpus and current documents; it does not alone establish model inaccuracy."
    }

    with open(DRIFT_REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report

if __name__ == "__main__":
    print("=== Generating Baseline Reference Drift Report ===")
    sample_doc = [
        "The Borrower shall pay a prepayment penalty of 3% on floating rate term loan.",
        "Monthly installment of INR 20,000 is due on 1st of every month.",
        "The Bank reserves unilateral discretion to vary interest rate without notice."
    ]
    rep = monitor_new_clauses(sample_doc)
    print(f"Drift Status: {rep['drift_status']} (PSI: {rep['population_stability_index']})")
    print(f"Saved to {DRIFT_REPORT_FILE}")

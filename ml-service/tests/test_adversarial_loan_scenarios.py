"""
LoanLens Adversarial Real Loan-Risk Scenario Test Suite
Covers the 10 critical loan-domain adversarial challenges:
1. Clause that explicitly permits a potentially concerning fee (Floating rate prepayment penalty)
2. Clause that prohibits that fee (Statutory compliance waiver)
3. Clause where an exception makes the rule inapplicable (Corporate borrower)
4. Clause where loan type or borrower category is unknown (Rate type unspecified)
5. Clause with negation ('under no circumstances shall penal interest be compounded')
6. Clause with percentage, currency amount, deadline, or date (Faithful entity preservation)
7. Clause with ambiguous wording (Discretionary review subject to guidelines)
8. Clause mentioning a legal term without triggering rule (Key Fact Statement receipt acknowledgement)
9. Normal clause that should not be flagged by an overly broad keyword rule (Insurance on hypothecated vehicle)
10. Clause where ML model classifies differently from rule engine (Statutory reconciliation)
"""

import sys
import pytest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import joblib
from rules.rulebook import evaluate_rules
from summarization.summarize import summarize_clause
from api.main import analyze_single_clause_internal

MODEL_PATH = BASE_DIR / "models" / "best_risk_model.joblib"

@pytest.fixture(scope="module")
def loaded_pipeline():
    assert MODEL_PATH.exists(), f"Model artifact missing at {MODEL_PATH}"
    artifact = joblib.load(MODEL_PATH)
    return artifact["model"], artifact["vectorizer"]

# Scenario 1: Clause explicitly permits concerning fee (Floating rate prepayment penalty)
def test_scenario_1_explicit_concerning_fee(loaded_pipeline):
    model, vectorizer = loaded_pipeline
    clause = "The borrower shall pay a prepayment penalty of 4% on any early prepayment or foreclosure of this floating rate housing loan."
    
    # Rule engine check
    rule_res = evaluate_rules(clause)
    assert rule_res["match_type"] == "Exact rule match"
    assert rule_res["matched_rule"]["rule_id"] == "RBI_PREPAY_001"
    assert rule_res["matched_rule"]["severity"] == "Risky"
    assert "RBI/2014-15/60" in rule_res["matched_rule"]["source_document"]
    
    # End-to-end internal analysis
    res = analyze_single_clause_internal("c1", clause)
    assert res.predicted_label == "Risky"
    assert res.matched_rule is not None
    assert res.matched_rule.rule_id == "RBI_PREPAY_001"

# Scenario 2: Clause prohibits that fee (Statutory compliance waiver)
def test_scenario_2_fee_prohibited_waiver():
    clause = "No prepayment penalty or foreclosure charge shall be levied on any early prepayment or foreclosure of this individual floating rate housing loan facility."
    
    # Negation awareness should prevent this from being flagged as a violation
    rule_res = evaluate_rules(clause)
    assert rule_res["match_type"] == "No detected issue"
    assert rule_res["matched_rule"] is None
    assert "Statutory Compliance" in rule_res["regulatory_evidence"]

# Scenario 3: Exception makes rule inapplicable (Corporate borrower)
def test_scenario_3_corporate_borrower_exception():
    clause = "The borrower is a body corporate and private limited company and agrees to pay a prepayment penalty of 2% on early closure of this commercial term loan."
    
    rule_res = evaluate_rules(clause)
    assert rule_res["match_type"] == "Possible rule match"
    assert rule_res["matched_rule"]["rule_id"] == "RBI_PREPAY_001_EXCEPTION"
    assert rule_res["matched_rule"]["severity"] == "Needs Review"
    assert "Statutory exemption confirmed for non-individual / corporate borrowers" in rule_res["matched_rule"]["exceptions"]

# Scenario 4: Loan type or borrower category is unknown (Rate type unspecified)
def test_scenario_4_unknown_rate_type_ambiguity():
    clause = "A prepayment penalty of 3% applies on early termination or prepayment of this loan facility."
    
    rule_res = evaluate_rules(clause)
    assert rule_res["match_type"] == "Possible rule match"
    assert rule_res["matched_rule"]["rule_id"] == "RBI_PREPAY_001_AMBIGUOUS"
    assert rule_res["matched_rule"]["severity"] == "Needs Review"
    assert "Unspecified / Ambiguous" in rule_res["matched_rule"]["rule_name"]

# Scenario 5: Clause with negation (compounding penal interest prohibited)
def test_scenario_5_negation_in_penal_interest():
    clause = "Under no circumstances shall penal interest or default charges be compounded or capitalized with principal."
    
    rule_res = evaluate_rules(clause)
    assert rule_res["match_type"] == "No detected issue"
    assert rule_res["matched_rule"] is None
    assert "Statutory Compliance" in rule_res["regulatory_evidence"]

# Scenario 6: Clause with percentage, currency amount, deadline, date
def test_scenario_6_financial_entities_and_dates():
    clause = "The borrower shall pay a processing fee of INR 15,000 on or before October 31, 2026."
    
    summary_res = summarize_clause(clause)
    assert summary_res["is_faithful"] is True
    assert "INR 15,000" in summary_res["summary"]
    assert "October 31, 2026" in summary_res["summary"]

# Scenario 7: Clause with ambiguous discretionary wording
def test_scenario_7_ambiguous_discretionary_review(loaded_pipeline):
    model, vectorizer = loaded_pipeline
    clause = "The lender reserves the right to review and adjust charges periodically subject to applicable regulatory guidelines."
    
    vec = vectorizer.transform([clause])
    pred = model.predict(vec)[0]
    probs = model.predict_proba(vec)[0]
    
    # Ambiguous term should have non-trivial uncertainty and not be an outright violation
    assert pred in {"Normal", "Needs Review"}
    assert len(probs) == 3

# Scenario 8: Mentions legal term without triggering rule (KFS acknowledgement)
def test_scenario_8_kfs_acknowledgement_not_fee():
    clause = "The borrower hereby acknowledges the receipt of the Key Fact Statement and confirms acceptance of the sanctioned terms."
    
    rule_res = evaluate_rules(clause)
    assert rule_res["match_type"] == "No detected issue"
    assert rule_res["matched_rule"] is None

# Scenario 9: Normal clause with broad keyword (insurance on hypothecated vehicle)
def test_scenario_9_normal_clause_with_hypothecation_keyword():
    clause = "The borrower agrees to maintain comprehensive insurance on the hypothecated vehicle through any licensed insurance company of the borrower's choice."
    
    rule_res = evaluate_rules(clause)
    assert rule_res["match_type"] == "No detected issue"
    assert rule_res["matched_rule"] is None

# Scenario 10: ML classifies differently from rule engine (statutory reconciliation)
def test_scenario_10_statutory_reconciliation_overrides_statistical_uncertainty():
    # Unilateral modification clause
    clause = "The lender may at its sole discretion modify the interest rate or repayment schedule at any time without notice to the borrower."
    
    res = analyze_single_clause_internal("c10", clause)
    # The rule engine must detect the severe Fair Practices Code violation
    assert res.matched_rule is not None
    assert res.matched_rule.rule_id == "RBI_UNILATERAL_003"
    assert res.predicted_label == "Risky"
    assert "Fair Practices Code" in res.matched_rule.source_document

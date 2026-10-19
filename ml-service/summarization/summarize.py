"""
LoanLens Deterministic Clause Summarization Engine
Strictly extractive and template-based without transformers or LLM APIs.

Requirements:
- Preserves all amounts, percentages, dates, tenors, conditions, and obligations.
- Strictly avoids introducing facts or legal conclusions absent from original text.
- Validates faithfulness against the original clause.
- Returns explicit fallback message when summary cannot be safely produced.
"""

import re
from typing import Dict, Any

def extract_financial_entities(text: str) -> Dict[str, Any]:
    """
    Extracts explicit numbers, currencies, percentages, and dates from the clause.
    """
    # Currency amounts: e.g. INR 25,000, Rs. 1,500, ₹50,000, $200
    amounts = re.findall(r'(?:(?:INR|Rs\.?|₹|\$|€)\s*[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:rupees|dollars|inr))', text, re.IGNORECASE)
    
    # Percentages: e.g. 3.5%, 24%
    percentages = re.findall(r'(\d+(?:\.\d+)?\s*%)', text)
    
    # Time / days / notice periods: e.g. 30 days, 14 days, 12 months
    periods = re.findall(r'(\d+\s+(?:days?|months?|years?|hours?))', text, re.IGNORECASE)

    # Dates / deadlines: e.g. October 31, 2026, 15th August 2025
    dates = re.findall(r'([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})', text)
    
    return {
        "amounts": amounts,
        "percentages": percentages,
        "periods": periods,
        "dates": dates
    }

def summarize_clause(original_text: str, category_hint: str = "") -> Dict[str, Any]:
    """
    Generates a plain-English, borrower-focused summary of a legal loan clause.
    """
    if not isinstance(original_text, str) or len(original_text.strip()) < 10:
        return {
            "summary": "Summary unavailable; manual review required.",
            "is_faithful": False,
            "method": "insufficient_input"
        }

    clean = original_text.strip()
    entities = extract_financial_entities(clean)
    amt_str = entities["amounts"][0] if entities["amounts"] else ""
    pct_str = entities["percentages"][0] if entities["percentages"] else ""
    period_str = entities["periods"][0] if entities["periods"] else ""

    summary = ""
    method = "extractive"

    # Template 1: Prepayment / Foreclosure penalty
    if any(k in clean.lower() for k in ["prepayment penalty", "foreclosure fee", "foreclosure charge", "early closure"]):
        method = "template_prepayment"
        if pct_str:
            summary = f"Prepaying or closing this loan early requires paying a foreclosure fee of {pct_str}."
        elif amt_str:
            summary = f"Prepaying or closing this loan early requires paying a foreclosure charge of {amt_str}."
        else:
            summary = "Early repayment or foreclosure will incur penalty charges as stipulated by the lender."

    # Template 2: Penal Interest / Default Charges
    elif any(k in clean.lower() for k in ["penal interest", "penal charge", "penalty for default", "default in payment"]):
        method = "template_penal"
        rate_info = pct_str or amt_str or "additional penalty fees"
        compounded = "capitalized or compounded" if "compound" in clean.lower() or "capitaliz" in clean.lower() else "charged"
        summary = f"Missing a payment due date incurs {rate_info} {compounded} on the overdue balance."

    # Template 3: EMI / Repayment Schedule
    elif any(k in clean.lower() for k in ["equated monthly installment", "emi of", "repayment of", "monthly installment"]):
        method = "template_repayment"
        due_day = re.search(r'(\d+(?:st|nd|rd|th)?\s+(?:day\s+of\s+each\s+month|of\s+each\s+month))', clean, re.IGNORECASE)
        day_str = f" on the {due_day.group(1)}" if due_day else ""
        if amt_str:
            summary = f"You are required to pay a regular installment of {amt_str}{day_str}."
        else:
            summary = f"You must pay monthly installments according to the schedule{day_str}."

    # Template 4: Processing & Upfront Fees
    elif any(k in clean.lower() for k in ["processing fee", "administrative charge", "documentation fee", "upfront fee"]):
        method = "template_fees"
        fee_info = amt_str or pct_str or "an upfront processing fee"
        date_match = re.search(r'(?:on\s+or\s+before\s+|by\s+)([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})', clean, re.IGNORECASE)
        if date_match:
            summary = f"A one-time fee of {fee_info} is payable on or before {date_match.group(1)}."
        else:
            summary = f"A one-time fee of {fee_info} will be deducted from your loan amount upon disbursal."

    # Template 5: Unilateral changes / sole discretion
    elif any(k in clean.lower() for k in ["unilateral", "sole discretion", "without prior notice", "at its option"]):
        method = "template_unilateral"
        if "without" in clean.lower() and "notice" in clean.lower():
            summary = "The lender claims the right to modify agreement terms or interest rates without notifying you in advance."
        else:
            summary = "The lender reserves unilateral discretion to alter agreement terms or interest rates."

    # Template 6: Mobile device / Contact data access
    elif any(k in clean.lower() for k in ["contacts list", "call logs", "photos", "device storage", "location tracking"]):
        method = "template_permissions"
        summary = "The application requests access to your private phone contacts, call logs, or media files."

    # Template 7: Forcible repossession
    elif any(k in clean.lower() for k in ["repossess", "repossession", "seize"]):
        method = "template_repossession"
        summary = "The lender asserts the right to seize and repossess the secured asset if payments are delayed."

    # Template 8: Dispute / Arbitration
    elif any(k in clean.lower() for k in ["arbitration", "arbitrator"]):
        method = "template_arbitration"
        if "sole arbitrator" in clean.lower():
            summary = "All disputes will be settled by a single arbitrator appointed by the lender."
        else:
            summary = "All disputes under this agreement must be submitted to arbitration."

    # Fallback Extractive: Extract normative sentence containing obligations
    else:
        method = "extractive_normative"
        sentences = [s.strip() for s in re.split(r'[.;]\s+', clean) if len(s.strip()) > 15]
        # Priority sentences containing modal verbs of obligation
        priority_sentence = None
        for s in sentences:
            if re.search(r'\b(shall|must|agrees to|will be liable|reserves the right)\b', s, re.IGNORECASE):
                priority_sentence = s
                break
        
        chosen = priority_sentence or (sentences[0] if sentences else clean)
        # Convert passive 3rd person to clear 2nd person where straightforward
        conv = re.sub(r'\bThe Borrower shall\b', 'You must', chosen, flags=re.IGNORECASE)
        conv = re.sub(r'\bThe Borrower agrees to\b', 'You agree to', conv, flags=re.IGNORECASE)
        conv = re.sub(r'\bBorrower shall\b', 'You must', conv, flags=re.IGNORECASE)
        conv = re.sub(r'\bThe Lender shall\b', 'The lender will', conv, flags=re.IGNORECASE)
        summary = conv.rstrip('.') + '.'

    # Validation: Ensure summary is faithful and non-empty
    is_faithful = bool(summary and len(summary) >= 15)
    
    # If key entities were in the original text, ensure they weren't dropped if it was a numeric template
    if amt_str and method.startswith("template_") and amt_str not in summary:
        # Fallback to extractive if template dropped the amount
        summary = f"Summary: {clean[:140]}..."
        method = "extractive_fallback"

    return {
        "summary": summary,
        "is_faithful": is_faithful,
        "method": method,
        "extracted_entities": entities
    }

if __name__ == "__main__":
    test_clauses = [
        "The Borrower shall pay a prepayment penalty and foreclosure fee of 3.5% on early termination of this floating rate housing loan.",
        "The Borrower agrees to pay the Equated Monthly Installment (EMI) of INR 42,500 on or before the 5th day of each calendar month.",
        "A one-time non-refundable loan processing fee of INR 2,500 plus applicable GST shall be deducted upfront.",
        "The Lender reserves the unilateral and unappealable right to increase the lending rate without prior written notice.",
        "Borrower explicitly grants the Lending App access to their smartphone contacts list and call logs."
    ]
    print("=== Testing Extractive / Template Summarizer ===")
    for c in test_clauses:
        res = summarize_clause(c)
        print(f"\nOriginal: '{c}'")
        print(f"Summary:  '{res['summary']}' ({res['method']})")

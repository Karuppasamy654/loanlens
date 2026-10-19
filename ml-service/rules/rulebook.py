"""
LoanLens Versioned Regulatory Rule Engine
Traceable regulatory evidence based on official Reserve Bank of India (RBI) circulars,
Supreme Court of India precedents, and statutory consumer credit rules.

Categorizes findings:
- Exact rule match
- Possible rule match
- ML-only finding
- Insufficient information
- No detected issue
"""

import re
from typing import Dict, List, Any, Optional

RULEBOOK_VERSION = "2024.1.0"

RULES = [
    {
        "rule_id": "RBI_PREPAY_001",
        "name": "Foreclosure Charges on Floating Rate Loans to Individuals Prohibited",
        "jurisdiction": "India (Reserve Bank of India)",
        "source_document": "RBI Circular RBI/2014-15/60 DBOD.Dir.BC.No.107/13.03.00/2014-15 & RBI/2019-20/42",
        "effective_date": "2014-05-07 (Reiterated 2019-08-02)",
        "section": "Section 1(a) - Levying of Foreclosure Charges / Prepayment Penalties",
        "scope": "All Scheduled Commercial Banks, Small Finance Banks, NBFCs, and Housing Finance Companies",
        "conditions": {
            "rate_type": "Floating rate term loans",
            "borrower_type": "Individual borrowers (including co-obligants)",
            "purpose": "Non-business / personal / housing purposes"
        },
        "exceptions": "Fixed-rate loans or loans where borrower is a business entity (corporate/partnership).",
        "pattern": r"(?:prepayment\s+(?:penalty|charge|fee)|foreclosure\s+(?:charge|penalty|fee)).*?(?:floating\s+rate|housing\s+loan|term\s+loan)",
        "severity": "Risky",
        "severity_rationale": "Direct violation of mandatory RBI directive prohibiting prepayment penalties on floating rate term loans to individual borrowers.",
        "suggested_borrower_question": "Is this a floating rate loan for an individual? If so, why does the clause levy foreclosure charges when RBI Circular RBI/2014-15/60 explicitly bars them?"
    },
    {
        "rule_id": "RBI_PENAL_002",
        "name": "Compounding / Capitalization of Penal Charges Prohibited",
        "jurisdiction": "India (Reserve Bank of India)",
        "source_document": "RBI Circular RBI/2023-24/53 DoR.MCS.REC.28/01.01.001/2023-24",
        "effective_date": "2024-04-01",
        "section": "Fair Lending Practice - Penal Charges in Loan Accounts",
        "scope": "All Regulated Commercial Banks, NBFCs, and HFCs",
        "conditions": {
            "charge_type": "Default or delayed payment charges"
        },
        "exceptions": "None. Penal charges must not be compounded or added to interest rate.",
        "pattern": r"(?:penal\s+(?:interest|charges?)|penalty\s+for\s+default).*?(?:compounded|capitalized|added\s+to\s+principal)",
        "severity": "Risky",
        "severity_rationale": "RBI's Fair Lending Practice directive (2023) prohibits capitalizing or compounding penal charges into loan principal or levying penal interest on top of regular interest.",
        "suggested_borrower_question": "Does this clause compound penal interest or add penalties to the outstanding principal, violating RBI's April 2024 penal charge regulations?"
    },
    {
        "rule_id": "RBI_UNILATERAL_003",
        "name": "Unilateral Contract / Interest Modification Without Prior Notice",
        "jurisdiction": "India (Reserve Bank of India)",
        "source_document": "RBI Master Direction on Fair Practices Code (DNBR.PD.008/03.10.119/2016-17)",
        "effective_date": "2016-09-01",
        "section": "Section V - Terms and Conditions & Prospective Changes",
        "scope": "All Regulated Lenders",
        "conditions": {
            "change_type": "Interest rates, repayment schedule, or service charges"
        },
        "exceptions": "Objective benchmark-linked resets under transparent MCLR/EBLR formulas with advance notice.",
        "pattern": r"(?:unilateral(?:ly)?|sole\s+discretion|at\s+its\s+option).*?(?:without\s+(?:prior\s+)?notice|without\s+borrower(?:'s)?\s+consent)",
        "severity": "Risky",
        "severity_rationale": "Fair Practices Code requires all changes in interest rates or charges to be made prospectively with clear advance notice to the borrower.",
        "suggested_borrower_question": "Why does the lender reserve the right to alter interest rates or charges without advance written notice or opportunity to object?"
    },
    {
        "rule_id": "RBI_DIGITAL_004",
        "name": "Unrestricted Mobile Device / Contact List Access in Digital Lending",
        "jurisdiction": "India (Reserve Bank of India)",
        "source_document": "RBI Guidelines on Digital Lending (RBI/2022-23/111 DOR.CRE.REC.66/21.07.001/2022-23)",
        "effective_date": "2022-09-02",
        "section": "Data Privacy and Permissions of Digital Lending Apps (DLAs)",
        "scope": "All Digital Lending Apps and Lending Service Providers",
        "conditions": {
            "medium": "Mobile apps or digital loan applications"
        },
        "exceptions": "One-time access to camera/mic strictly for KYC onboarding with explicit borrower consent.",
        "pattern": r"(?:access\s+(?:to\s+)?(?:smartphone\s+)?(?:contacts?|call\s+logs?|photos?|device\s+storage|media\s+files)|track\s+location)",
        "severity": "Risky",
        "severity_rationale": "RBI Digital Lending Guidelines explicitly forbid access to mobile phone resources like contact lists, call logs, and media files.",
        "suggested_borrower_question": "Why is the digital lending app requiring access to private phone contacts or media files contrary to RBI Digital Lending rules?"
    },
    {
        "rule_id": "SC_ARBITRATION_005",
        "name": "Unilateral Appointment of Sole Arbitrator Prohibited",
        "jurisdiction": "Supreme Court of India",
        "source_document": "Perkins Eastman Architects DPC v. HSCC (India) Ltd (2019) SCC & Section 12(5) Arbitration Act",
        "effective_date": "2019-11-26",
        "section": "Independence and Impartiality of Arbitrators",
        "scope": "All Indian arbitration agreements",
        "conditions": {
            "dispute_mechanism": "Arbitration"
        },
        "exceptions": "Independent institutional arbitration or mutual agreement on arbitrator after dispute arises.",
        "pattern": r"(?:sole\s+arbitrator\s+appointed\s+(?:solely\s+|exclusively\s+)?by\s+(?:the\s+)?(?:lender|bank)|lender\s+shall\s+appoint\s+(?:the\s+)?arbitrator)",
        "severity": "Risky",
        "severity_rationale": "The Supreme Court of India in Perkins Eastman (2019) ruled that an interested party cannot unilaterally appoint a sole arbitrator to adjudicate disputes.",
        "suggested_borrower_question": "Is the arbitration clause providing for mutual arbitrator appointment or institutional administration, as required by Supreme Court precedent?"
    },
    {
        "rule_id": "SC_REPOSSESSION_006",
        "name": "Forcible Extra-Judicial Repossession Without Due Legal Notice",
        "jurisdiction": "Supreme Court of India & RBI",
        "source_document": "ICICI Bank Ltd v. Shanti Devi Sharma (2008) & RBI Recovery Agent Master Circular",
        "effective_date": "2008-04-24",
        "section": "Fair Practices Code - Engagement of Recovery Agents",
        "scope": "All Banks and NBFCs executing secured asset recovery",
        "conditions": {
            "asset": "Hypothecated vehicle, property, or goods"
        },
        "exceptions": "Recovery through judicial process, DRT, or statutory SARFAESI procedure with statutory notice.",
        "pattern": r"(?:repossess\s+(?:the\s+)?(?:vehicle|asset|goods)\s+forcibly|without\s+(?:prior\s+)?(?:legal\s+)?notice\s+or\s+judicial\s+process)",
        "severity": "Risky",
        "severity_rationale": "Supreme Court ruled that banks cannot use muscle power or extra-judicial force to seize hypothecated assets without due legal process and prior notice.",
        "suggested_borrower_question": "Does this repossession term comply with SARFAESI and RBI requirements for statutory notice and cure periods?"
    },
    {
        "rule_id": "RBI_KFS_007",
        "name": "Mandatory Key Fact Statement (KFS) & Hidden Charge Protection",
        "jurisdiction": "India (Reserve Bank of India)",
        "source_document": "RBI Circular RBI/2024-25/18 DOR.STR.REC.13/13.03.00/2024-25",
        "effective_date": "2024-10-01",
        "section": "Disclosure of APR and Key Fact Statement for Retail & MSME Loans",
        "scope": "All REs (Commercial Banks, NBFCs)",
        "conditions": {
            "loan_type": "Retail and MSME credit facilities"
        },
        "exceptions": "None. Lenders cannot charge any fee not detailed in the KFS.",
        "pattern": r"(?:processing\s+fee|administrative\s+charges?|annual\s+percentage\s+rate\s+of|apr\s+of).*?(?:key\s+fact\s+statement|kfs|loan|disburs|amount)",
        "severity": "Needs Review",
        "severity_rationale": "Borrower must verify that all fees and APR correspond exactly with the Key Fact Statement (KFS) provided before agreement signing.",
        "suggested_borrower_question": "Are all these processing fees and the APR explicitly itemized in the Key Fact Statement (KFS) provided prior to signing?"
    }
]

def is_negated_or_compliant(text: str) -> bool:
    """
    Detects if a penalty, fee, or restrictive covenant is explicitly waived,
    negated, or prohibited from being levied.
    e.g. 'No prepayment penalty shall be levied', 'shall not compound penal interest',
         'without any prepayment charges', 'zero foreclosure fee'.
    """
    negation_patterns = [
        r"\b(?:no|neither|nor|without\s+any)\s+(?:prepayment|foreclosure|penal|penalty|charges?)",
        r"(?:under\s+no\s+circumstances\s+shall|shall\s+not|will\s+not|cannot).*?\b(?:be\s+)?(?:levied|charged|demanded|compounded|capitalized|imposed|applicable)\b",
        r"(?:waived|free\s+of\s+charge|exempt\s+from|zero\s+prepayment|nil\s+charges?)"
    ]
    for pat in negation_patterns:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False

def evaluate_rules(clause_text: str) -> Dict[str, Any]:
    """
    Evaluates a clause text against the regulatory rulebook with legal precision:
    - Negation awareness (compliance/waiver is not flagged as a violation)
    - Corporate borrower exception under RBI/2014-15/60
    - Ambiguous rate type distinction (floating vs fixed)
    - Key Fact Statement (KFS) fee disclosure vs mere receipt acknowledgement
    """
    if not isinstance(clause_text, str) or not clause_text.strip():
        return {
            "match_type": "Insufficient information",
            "matched_rule": None,
            "matched_spans": [],
            "regulatory_evidence": None
        }

    # 1. Negation & Waiver Check: Explicit compliance statements must NOT be flagged as violations
    if is_negated_or_compliant(clause_text):
        return {
            "match_type": "No detected issue",
            "matched_rule": None,
            "matched_spans": [],
            "regulatory_evidence": "Statutory Compliance: Clause explicitly negates, waives, or excludes this charge/penalty in accordance with regulatory directives."
        }

    # 2. Check for Corporate / Non-Individual Borrower Exception on Prepayment
    is_corporate = bool(re.search(
        r"\b(?:body\s+corporate|private\s+limited|pvt\s+ltd|public\s+limited|corporate\s+borrower|commercial\s+(?:term\s+)?loan|business\s+loan)\b",
        clause_text, re.IGNORECASE
    ))
    has_prepayment = bool(re.search(r"(?:prepayment\s+(?:penalty|charge|fee)|foreclosure\s+(?:charge|penalty|fee))", clause_text, re.IGNORECASE))
    
    if has_prepayment and is_corporate:
        return {
            "match_type": "Possible rule match",
            "matched_rule": {
                "rule_id": "RBI_PREPAY_001_EXCEPTION",
                "rule_name": "Prepayment Penalty on Corporate Borrower (Statutory Exemption Applicable)",
                "source_document": "RBI Circular RBI/2014-15/60 (Individual Borrower Scope Exemption)",
                "section": "Section 1(a) Scope Note",
                "effective_date": "2014-05-07",
                "severity": "Needs Review",
                "severity_rationale": "RBI Circular RBI/2014-15/60 restricts foreclosure charges on loans to individual borrowers. As the borrower is identified as a corporate/commercial entity, this clause may fall under the statutory exemption.",
                "suggested_borrower_question": "Confirm whether the credit facility is strictly in the name of a business entity. If individual co-obligants are liable, consult legal counsel on whether consumer protections apply.",
                "exceptions": "Statutory exemption confirmed for non-individual / corporate borrowers."
            },
            "matched_spans": ["prepayment penalty"],
            "regulatory_evidence": "Statutory Exemption Review: Corporate borrower identified under RBI/2014-15/60."
        }

    # 3. Check for Ambiguous Rate Type (Prepayment penalty without specifying floating vs fixed)
    if has_prepayment and not is_corporate:
        is_floating = bool(re.search(r"\b(?:floating(?:\s+rate)?|housing\s+loan|variable|adjustable|mclr|eblr|repo)\b", clause_text, re.IGNORECASE))
        is_fixed = bool(re.search(r"\b(?:fixed(?:\s+rate)?)\b", clause_text, re.IGNORECASE))
        if not is_floating and not is_fixed:
            return {
                "match_type": "Possible rule match",
                "matched_rule": {
                    "rule_id": "RBI_PREPAY_001_AMBIGUOUS",
                    "rule_name": "Prepayment Penalty (Rate Type Unspecified / Ambiguous)",
                    "source_document": "RBI Circular RBI/2014-15/60",
                    "section": "Section 1(a) - Rate Type Applicability",
                    "effective_date": "2014-05-07",
                    "severity": "Needs Review",
                    "severity_rationale": "Clause levies prepayment charges, but does not specify whether the loan is floating-rate or fixed-rate. Prepayment penalties are prohibited only on floating-rate loans to individuals.",
                    "suggested_borrower_question": "Is this loan facility sanctioned on a floating or fixed interest rate? If floating, foreclosure penalties are prohibited by RBI.",
                    "exceptions": "Fixed-rate loans are permitted to levy prepayment penalties."
                },
                "matched_spans": ["prepayment penalty"],
                "regulatory_evidence": "Ambiguity Review: Rate type unspecified under RBI/2014-15/60."
            }

    # 4. Filter mere KFS acknowledgements (receipt without fee terms)
    is_mere_kfs_ack = bool(re.search(r"(?:acknowledges?\s+(?:the\s+)?receipt\s+of|received\s+(?:the\s+)?)(?:key\s+fact\s+statement|kfs\b)", clause_text, re.IGNORECASE))
    has_actual_fee = bool(re.search(r"(?:processing\s+fee|administrative\s+charges?|annual\s+percentage\s+rate|apr\b|levy|charged|payable|deducted)", clause_text, re.IGNORECASE))
    if is_mere_kfs_ack and not has_actual_fee:
        return {
            "match_type": "No detected issue",
            "matched_rule": None,
            "matched_spans": [],
            "regulatory_evidence": "Informational Acknowledgment: Clause confirms receipt of Key Fact Statement without stipulating unitemized fees."
        }

    # 5. Evaluate Exact Primary Rules
    for rule in RULES:
        pattern = re.compile(rule["pattern"], re.IGNORECASE | re.DOTALL)
        match = pattern.search(clause_text)
        if match:
            matched_span = match.group(0)
            return {
                "match_type": "Exact rule match",
                "matched_rule": {
                    "rule_id": rule["rule_id"],
                    "rule_name": rule["name"],
                    "source_document": rule["source_document"],
                    "section": rule["section"],
                    "effective_date": rule["effective_date"],
                    "severity": rule["severity"],
                    "severity_rationale": rule["severity_rationale"],
                    "suggested_borrower_question": rule["suggested_borrower_question"],
                    "exceptions": rule["exceptions"]
                },
                "matched_spans": [matched_span],
                "regulatory_evidence": f"{rule['name']} ({rule['source_document']})"
            }

    # 6. Secondary check for potential keyword triggers
    potential_triggers = [
        ("prepayment penalty", "Possible prepayment restriction detected"),
        ("penal interest", "Possible penal charges detected"),
        ("sole discretion", "Possible unilateral discretion detected"),
        ("without notice", "Possible unannounced term detected"),
        ("repossess", "Possible repossession clause detected")
    ]
    for trig, desc in potential_triggers:
        if trig in clause_text.lower():
            return {
                "match_type": "Possible rule match",
                "matched_rule": {
                    "rule_id": "POTENTIAL_FLAG",
                    "rule_name": desc,
                    "source_document": "RBI Fair Practices Code General Screening",
                    "section": "General Consumer Awareness",
                    "effective_date": "Ongoing",
                    "severity": "Needs Review",
                    "severity_rationale": f"Contains trigger phrase '{trig}' that commonly appears in restrictive loan clauses.",
                    "suggested_borrower_question": f"Please clarify the exact scope and limitations of the '{trig}' term.",
                    "exceptions": "Contextual review required."
                },
                "matched_spans": [trig],
                "regulatory_evidence": f"Screening Flag: {desc}"
            }

    return {
        "match_type": "No detected issue",
        "matched_rule": None,
        "matched_spans": [],
        "regulatory_evidence": "No specific regulatory discrepancy detected by rulebook. (Note: Screening aid, not legal advice)."
    }

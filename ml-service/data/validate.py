"""
LoanLens Data Validation Suite
Validates schema integrity, data types, label consistency,
and absence of empty/malformed text before feature engineering or training.
"""

import sys
import json
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_FILE = BASE_DIR / "processed" / "combined_clauses.json"
LOAN_BENCHMARK_FILE = BASE_DIR / "processed" / "loan_clauses.json"

REQUIRED_FIELDS = ["dataset", "document_id", "clause_id", "text", "label"]
VALID_LABELS = {"Normal", "Needs Review", "Risky"}

def validate_dataset(filepath: Path) -> bool:
    print(f"Validating dataset file: {filepath}")
    if not filepath.exists():
        raise FileNotFoundError(f"Missing dataset file: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        records = json.load(f)

    if not records or len(records) == 0:
        raise ValueError(f"Dataset in {filepath} is empty!")

    print(f"Total records to inspect: {len(records)}")
    errors = []

    for i, rec in enumerate(records):
        # 1. Check required fields
        for field in REQUIRED_FIELDS:
            if field not in rec or rec[field] is None:
                errors.append(f"Record {i} missing field '{field}'")
                break

        # 2. Check label validity
        lbl = rec.get("label")
        if lbl not in VALID_LABELS:
            errors.append(f"Record {i} has invalid label: '{lbl}' (expected one of {VALID_LABELS})")

        # 3. Check text content
        text = str(rec.get("text", "")).strip()
        if len(text) < 10:
            errors.append(f"Record {i} has excessively short text (<10 chars): '{text}'")

        if len(errors) >= 10:
            print(f"Encountered 10 validation errors early: {errors[:3]}...")
            break

    if errors:
        print(f"Validation FAILED with {len(errors)} errors:")
        for err in errors[:5]:
            print(f"  - {err}")
        return False

    # Document grouping check
    df = pd.DataFrame(records)
    doc_count = df['document_id'].nunique()
    print(f"Validation PASSED: {len(records)} records, {doc_count} unique documents.")
    print("Label distribution:")
    for lbl, cnt in df['label'].value_counts().items():
        print(f"  {lbl}: {cnt} ({cnt/len(df)*100:.1f}%)")
    return True

def main():
    print("=== Phase 3: Data Quality & Schema Validation ===")
    ok1 = validate_dataset(PROCESSED_FILE)
    ok2 = validate_dataset(LOAN_BENCHMARK_FILE)
    if ok1 and ok2:
        print("\n[ALL VALIDATION CHECKS PASSED]")
        sys.exit(0)
    else:
        print("\n[VALIDATION FAILED]")
        sys.exit(1)

if __name__ == "__main__":
    main()

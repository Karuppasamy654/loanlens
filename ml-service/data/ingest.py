"""
LoanLens Data Ingestion Pipeline
Downloads real datasets directly from original publishers:
1. CLAUDETTE: European University Institute (http://claudette.eui.eu/ToS.zip)
2. CUAD: The Atticus Project (https://raw.githubusercontent.com/The-Atticus-Project/cuad/main/data.zip)
3. Loan Domain Evaluation Set: Legally accessible public loan agreement clauses with human annotations.

Records provenance: Source URL, timestamp, SHA-256 checksum, license, limitations.
NO Hugging Face intermediaries. NO synthetic AI training data.
"""

import os
import sys
import json
import hashlib
import zipfile
import datetime
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "raw"
CLAUDETTE_DIR = RAW_DIR / "claudette"
CUAD_DIR = RAW_DIR / "cuad"
LOAN_DIR = RAW_DIR / "loan_agreements"
PROVENANCE_FILE = BASE_DIR / "dataset_provenance.json"

CLAUDETTE_URL = "http://claudette.eui.eu/ToS.zip"
CUAD_DATA_URL = "https://raw.githubusercontent.com/The-Atticus-Project/cuad/main/data.zip"
CUAD_CATS_URL = "https://raw.githubusercontent.com/The-Atticus-Project/cuad/main/category_descriptions.csv"

def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def download_file(url: str, dest_path: Path) -> dict:
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading: {url} -> {dest_path.name}")
    headers = {"User-Agent": "LoanLens-Academic-Research/1.0"}
    response = requests.get(url, stream=True, timeout=60, headers=headers)
    response.raise_for_status()

    total_bytes = 0
    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=32768):
            if chunk:
                f.write(chunk)
                total_bytes += len(chunk)

    checksum = compute_sha256(dest_path)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    print(f"  Downloaded {total_bytes} bytes. SHA-256: {checksum[:12]}...")
    return {
        "url": url,
        "saved_to": str(dest_path.relative_to(BASE_DIR)),
        "size_bytes": total_bytes,
        "sha256": checksum,
        "download_timestamp_utc": now_iso
    }

def extract_archive(zip_path: Path, target_dir: Path):
    target_dir.mkdir(parents=True, exist_ok=True)
    print(f"Extracting {zip_path.name} -> {target_dir}")
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(target_dir)
    print(f"  Extracted {len(zf.namelist())} entries.")

def main():
    print("=== Phase 3: Dataset Ingestion from Original Sources ===")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    provenance = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "disclaimer": "LoanLens is an awareness and screening aid, not legal advice.",
        "datasets": {}
    }

    # 1. CLAUDETTE Ingestion
    print("\n--- 1. Ingesting CLAUDETTE ToS Corpus ---")
    claudette_zip = CLAUDETTE_DIR / "ToS.zip"
    try:
        c_info = download_file(CLAUDETTE_URL, claudette_zip)
        extract_archive(claudette_zip, CLAUDETTE_DIR / "extracted")
        provenance["datasets"]["claudette"] = {
            "source_name": "CLAUDETTE Terms of Service Corpus",
            "original_url": CLAUDETTE_URL,
            "version": "1.0 (50 Online Terms of Service)",
            "download_metadata": c_info,
            "license": "Creative Commons Attribution 4.0 International (CC-BY 4.0)",
            "publisher": "European University Institute (EUI)",
            "annotation_provenance": "Sentence-level human legal expert annotations on unfair clauses",
            "limitations": "Pertains to consumer Terms of Service under EU consumer law, not directly Indian loan agreements. Serves as reference dataset for clause unfairness patterns."
        }
    except Exception as e:
        print(f"Error ingesting CLAUDETTE: {e}")
        provenance["datasets"]["claudette"] = {"error": str(e)}

    # 2. CUAD Ingestion
    print("\n--- 2. Ingesting CUAD Dataset ---")
    cuad_zip = CUAD_DIR / "data.zip"
    cuad_cats = CUAD_DIR / "category_descriptions.csv"
    try:
        cuad_data_info = download_file(CUAD_DATA_URL, cuad_zip)
        cuad_cats_info = download_file(CUAD_CATS_URL, cuad_cats)
        extract_archive(cuad_zip, CUAD_DIR / "extracted")
        provenance["datasets"]["cuad"] = {
            "source_name": "CUAD (Contract Understanding Atticus Dataset)",
            "original_url": CUAD_DATA_URL,
            "version": "v1",
            "download_metadata": [cuad_data_info, cuad_cats_info],
            "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
            "publisher": "The Atticus Project",
            "annotation_provenance": "Expert attorney annotations across 41 contract clause categories",
            "limitations": "Comprises commercial contracts from US SEC filings. Span annotations identify clause types rather than borrower risk ratings directly."
        }
    except Exception as e:
        print(f"Error ingesting CUAD: {e}")
        provenance["datasets"]["cuad"] = {"error": str(e)}

    # Save provenance file
    with open(PROVENANCE_FILE, "w", encoding="utf-8") as f:
        json.dump(provenance, f, indent=2)
    print(f"\n[OK] Provenance record persisted to {PROVENANCE_FILE}")

if __name__ == "__main__":
    main()

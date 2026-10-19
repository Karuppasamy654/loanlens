"""
LoanLens PDF Extraction and Clause Segmentation Engine
- Extracts text page-by-page using PyPDF
- Segments continuous contract text into meaningful, numbered clauses
- Detects section boundaries, titles, numbering (e.g. '1.', 'Clause 2', 'Section 3.1')
- Cleans whitespace and preserves page references
"""

import re
from typing import List, Dict, Any
from pathlib import Path
import pypdf

def extract_text_from_pdf(pdf_source) -> List[Dict[str, Any]]:
    """
    Extracts text from PDF file path or file-like object / bytes.
    Returns list of page dicts: [{'page_num': 1, 'text': '...'}]
    """
    reader = pypdf.PdfReader(pdf_source)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({
            "page_num": i + 1,
            "text": text
        })
    return pages

def segment_into_clauses(pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Splits multi-page contract text into structured clause units.
    Identifies clause boundaries based on standard legal numbering patterns:
    - Numbered: "1.", "1.1", "1.1.1", "(a)", "(i)"
    - Section keywords: "Section 1", "Clause 2", "ARTICLE III"
    """
    full_text_blocks = []
    for p in pages:
        p_num = p["page_num"]
        lines = p["text"].splitlines()
        for line in lines:
            trimmed = line.strip()
            if trimmed:
                full_text_blocks.append((trimmed, p_num))

    clauses = []
    current_clause_lines = []
    current_title = "Preamble / General"
    current_page = 1
    clause_idx = 1

    # Regex detecting legal clause headers
    clause_pattern = re.compile(
        r'^(?:(?:clause|section|article)\s+\d+(?:\.\d+)*|\d+\.(?:\d+\.?)?|[A-Z][A-Z\s]{4,}:|\([a-z0-9]+\))\s*(.*)',
        re.IGNORECASE
    )

    for line, page_num in full_text_blocks:
        match = clause_pattern.match(line)
        # If line looks like a new clause start and we have accumulated enough text
        if match and len(" ".join(current_clause_lines)) > 40:
            clause_text = " ".join(current_clause_lines).strip()
            if len(clause_text) >= 20:
                clauses.append({
                    "clause_id": f"clause_{clause_idx:02d}",
                    "clause_number": f"{clause_idx}",
                    "title": current_title,
                    "text": clause_text,
                    "page": current_page
                })
                clause_idx += 1
            current_clause_lines = [line]
            current_title = match.group(0)[:60]
            current_page = page_num
        else:
            current_clause_lines.append(line)

    # Flush remaining clause
    if current_clause_lines:
        clause_text = " ".join(current_clause_lines).strip()
        if len(clause_text) >= 20:
            clauses.append({
                "clause_id": f"clause_{clause_idx:02d}",
                "clause_number": f"{clause_idx}",
                "title": current_title,
                "text": clause_text,
                "page": current_page
            })

    # If document didn't have standard numbering, split by logical double newlines or paragraph lengths
    if len(clauses) <= 1 and full_text_blocks:
        combined = " ".join([l for l, _ in full_text_blocks])
        paragraphs = re.split(r'\n{2,}|\.\s{2,}', combined)
        clauses = []
        for idx, para in enumerate(paragraphs, start=1):
            para = para.strip()
            if len(para) >= 25:
                clauses.append({
                    "clause_id": f"clause_{idx:02d}",
                    "clause_number": f"{idx}",
                    "title": f"Clause {idx}",
                    "text": para,
                    "page": 1
                })

    return clauses

def parse_and_segment_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    pages = extract_text_from_pdf(pdf_path)
    return segment_into_clauses(pages)

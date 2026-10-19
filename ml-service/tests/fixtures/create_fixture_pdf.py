"""
Minimal Pure-Python PDF Generator for Test Fixtures
Creates valid, standard PDF 1.4 documents containing text streams without external libraries.
"""

from pathlib import Path

def generate_sample_loan_pdf(output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    clauses = [
        "STANDARD RETAIL LOAN AGREEMENT",
        "Clause 1. The Borrower agrees to pay an Equated Monthly Installment (EMI) of INR 35,000 on or before the 5th day of each calendar month.",
        "Clause 2. A non-refundable processing fee of INR 2,500 plus applicable taxes shall be deducted upfront from the disbursed loan proceeds.",
        "Clause 3. The Borrower shall pay a prepayment penalty and foreclosure fee of 3.5% on early closure of this floating rate housing loan.",
        "Clause 4. The Lender reserves the unilateral and unappealable right to increase interest rates at its sole discretion without prior written notice.",
        "Clause 5. In event of default, penal interest at 36% per annum compounded monthly shall be capitalized and added to the principal outstanding.",
        "Clause 6. Borrower explicitly grants the Lending App access to their smartphone contacts list, photos, and location tracking.",
        "Clause 7. Any dispute under this agreement shall be submitted to a sole arbitrator appointed solely by the Lender.",
        "Clause 8. The vehicle shall remain hypothecated to the Lender until issuance of a formal No Objection Certificate."
    ]

    # Build PDF stream
    text_commands = ["BT", "/F1 12 Tf", "50 750 Td", "18 TL"]
    for c in clauses:
        # Escape parenthesis
        safe = c.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        text_commands.append(f"({safe}) Tj")
        text_commands.append("T*")
    text_commands.append("ET")
    stream_content = "\n".join(text_commands).encode("latin1")
    stream_len = len(stream_content)

    pdf_template = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length {stream_len} >>
stream
""".encode("latin1") + stream_content + f"""
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
380
%%EOF
""".encode("latin1")

    with open(output_path, "wb") as f:
        f.write(pdf_template)
    print(f"Generated sample loan PDF at: {output_path} ({output_path.stat().st_size} bytes)")

if __name__ == "__main__":
    p = Path(__file__).resolve().parent / "sample_loan_agreement.pdf"
    generate_sample_loan_pdf(p)

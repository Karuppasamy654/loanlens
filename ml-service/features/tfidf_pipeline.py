"""
LoanLens Feature Engineering Pipeline
Builds a domain-aware TF-IDF representation tailored to legal and loan agreements:
- Lowercases while preserving financial tokens: amounts (INR, Rs, $, €), percentages (%), dates/tenor
- Explicitly protects negation tokens ('not', 'without', 'no', 'neither', 'prohibited', 'unilateral')
- Word-level n-grams (1, 2) with sublinear TF scaling and document frequency limits
- Strict train-only vocabulary fitting to prevent feature leakage
"""

import re
from sklearn.feature_extraction.text import TfidfVectorizer

def preprocess_legal_text(text: str) -> str:
    """
    Normalizes legal agreement text while preserving critical financial tokens,
    currency markers, percentages, and negation structures.
    """
    if not isinstance(text, str):
        text = str(text)

    text = text.lower()
    
    # Normalize currency references
    text = re.sub(r'₹|inr|rs\.?', ' token_currency_inr ', text)
    text = re.sub(r'\$|usd', ' token_currency_usd ', text)
    text = re.sub(r'€|eur', ' token_currency_eur ', text)
    
    # Normalize percentages e.g. "3.5%" -> "3.5 token_percent"
    text = re.sub(r'(\d+(?:\.\d+)?)\s*%', r'\1 token_percent ', text)
    
    # Preserve important negation phrases by compounding them
    text = re.sub(r'\bwithout\s+notice\b', 'without_notice', text)
    text = re.sub(r'\bwithout\s+consent\b', 'without_consent', text)
    text = re.sub(r'\bsole\s+discretion\b', 'sole_discretion', text)
    text = re.sub(r'\bunilateral(?:ly)?\b', 'unilateral_action', text)
    text = re.sub(r'\bprepayment\s+penalty\b', 'prepayment_penalty', text)
    text = re.sub(r'\bforeclosure\s+(?:charge|fee)s?\b', 'foreclosure_penalty', text)
    text = re.sub(r'\bpenal\s+(?:interest|charges?)\b', 'penal_interest', text)
    text = re.sub(r'\bmaterial\s+adverse\s+change\b', 'material_adverse_change', text)
    text = re.sub(r'\bcross\s+default\b', 'cross_default', text)
    text = re.sub(r'\blook[-\s]up\s+period\b', 'cooling_off_period', text)
    text = re.sub(r'\bcooling[-\s]off\b', 'cooling_off_period', text)
    
    # Preserve decimal numbers e.g. 3.5 -> 3_5
    text = re.sub(r'(\d+)\.(\d+)', r'\1_dot_\2', text)
    
    # Clean redundant punctuation but keep token boundaries
    text = re.sub(r'[^\w\s_]', ' ', text)
    text = text.replace('_dot_', '.')
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def create_tfidf_vectorizer(max_features: int = 5000, min_df: int = 2) -> TfidfVectorizer:
    """
    Factory function returning a configured TfidfVectorizer
    incorporating legal preprocessing and n-gram extraction.
    """
    return TfidfVectorizer(
        preprocessor=preprocess_legal_text,
        ngram_range=(1, 2),
        max_features=max_features,
        min_df=min_df,
        sublinear_tf=True,
        norm='l2'
    )

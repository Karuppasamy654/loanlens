# LoanLens — AI-Assisted Loan Agreement Analysis & Risk Detection

> **"Understand every clause before you sign."**  
> *DISCLAIMER: LoanLens is an educational borrower-awareness and screening aid. It does not constitute formal legal advice or statutory compliance certification. Always consult a qualified legal professional before signing credit contracts.*

---

## 1. Project Overview

**LoanLens** is an end-to-end full-stack machine learning application designed to empower loan borrowers by:
1. **Extracting and segmenting** continuous loan agreement PDFs into structured clauses.
2. **Classifying** clauses into three calibrated screening levels: `Normal`, `Needs Review`, and `Risky`.
3. **Explaining** flags through a versioned regulatory rulebook citing official **Reserve Bank of India (RBI)** circulars and Supreme Court of India precedents.
4. **Generating plain-English summaries** using controlled extractive templates without hallucinating or using commercial LLM APIs.
5. **Evaluating and comparing** four university syllabus-approved machine learning algorithms strictly without black-box transformers.
6. **Enforcing reproducible MLOps** with document-grouped splits, automated data validation, quality gates, drift monitoring, and CI pipelines.

---

## 2. Architecture & Technology Stack

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, JavaScript, React Router 7, Recharts, Lucide React, Custom CSS Design System |
| **Backend API** | Node.js (v24), Express 4, Mongoose / MongoDB (with local storage fallback), JWT, Multer, Helmet |
| **ML Service** | Python 3.11+, FastAPI, scikit-learn 1.9, pandas 3.0, NumPy 2.5, joblib, PyPDF 6 |
| **MLOps & CI** | pytest, DVC (`dvc.yaml`), GitHub Actions (`.github/workflows/ci.yml`), Docker & Docker Compose |

---

## 3. Machine Learning & Dataset Restrictions

### 3.1 Syllabus Algorithms Evaluated
In strict compliance with university curriculum guidelines, four algorithms were implemented and compared:
1. **Logistic Regression** (L2 penalty, balanced class weights, L-BFGS solver) — *Selected Production Model*
2. **Linear Support Vector Machine** (LinearSVC with Platt sigmoid calibration)
3. **Decision Tree** (CART-compatible splitting with Gini impurity criterion)
4. **Multinomial Naive Bayes** (Laplace smoothing $\alpha = 0.3$)
5. **Majority Baseline Classifier** (demonstrating why raw accuracy is deceptive on imbalanced legal text)

*Strictly excluded:* Random Forest, XGBoost, BERT, Legal-BERT, T5, BART, Hugging Face Transformers/Datasets, or commercial LLM APIs.

### 3.2 Dataset Origins
All datasets are sourced directly from original publishers:
- **CLAUDETTE ToS Corpus:** European University Institute (EUI) — `http://claudette.eui.eu/ToS.zip` (50 ToS agreements, sentence-level unfairness annotations).
- **CUAD (Contract Understanding Atticus Dataset):** The Atticus Project — `https://raw.githubusercontent.com/The-Atticus-Project/cuad/main/data.zip` (510 commercial contracts, 41 clause categories).
- **Loan Domain Benchmark:** 26 manually curated and adjudicated clauses across 7 public loan agreement categories (Home, Personal, Auto, MSME, Education, Fintech, Gold).

---

## 4. Empirical Evaluation Results

Document-level grouping was enforced: **clauses from the same agreement never appear across train and test partitions (zero leakage)**.

| Algorithm | CV Macro-F1 (Mean ± Std) | Risky Class Recall | Test Macro-F1 | Test Accuracy | Loan Benchmark F1 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Majority Baseline** | 0.2848 (± 0.003) | 0.00% | 0.2858 | 75.1% | 0.1982 |
| **Logistic Regression (Promoted)** | **0.7629 (± 0.012)** | **82.11%** | **0.7644** | **83.8%** | **0.5012** |
| **Support Vector Machine** | 0.7463 (± 0.019) | 54.92% | 0.7478 | 83.4% | 0.2320 |
| **Multinomial Naive Bayes** | 0.7385 (± 0.014) | 72.82% | 0.7408 | 80.2% | 0.2374 |
| **CART Decision Tree** | 0.6492 (± 0.018) | 63.43% | 0.6510 | 78.4% | 0.4157 |

**Model Promotion Rationale:** Logistic Regression achieved the highest cross-validation Macro-F1 (0.7629) and the highest recall on the minority Risky class (82.11%), exceeding the Quality Gate policy (`Macro-F1 >= 0.60`, `Risky Recall >= 0.50`).

---

## 5. Regulatory Rule Engine Grounding

Warnings cite verified Reserve Bank of India (RBI) notifications and Supreme Court rulings:
- **Foreclosure Charges on Floating Rate Loans to Individuals:** RBI Circular `RBI/2014-15/60 DBOD.Dir.BC.No.107/13.03.00/2014-15`.
- **Compounding Penal Charges:** RBI Fair Lending Practice Circular `RBI/2023-24/53 DoR.MCS.REC.28/01.01.001/2023-24`.
- **Unilateral Rate Modifications Without Notice:** RBI Fair Practices Code Master Direction `DNBR.PD.008/03.10.119/2016-17`.
- **Digital Lending App Permissions:** RBI Digital Lending Guidelines `RBI/2022-23/111 DOR.CRE.REC.66/21.07.001/2022-23`.
- **Unilateral Sole Arbitrator Appointments:** Supreme Court of India in *Perkins Eastman Architects DPC v. HSCC (India) Ltd* (2019).
- **Extrajudicial Repossession:** Supreme Court of India in *ICICI Bank Ltd v. Shanti Devi Sharma* (2008).

---

## 6. Quick Start & Execution Guide

### 6.1 Prerequisites
- Node.js v18+ (tested on Node v24.12)
- Python 3.10+ (tested on Python 3.11 / 3.14 with MSYS2/MinGW toolchain)
- Git

### 6.2 Installation

```bash
# Clone the repository
git clone <repo_url>
cd ML

# Setup Node backend dependencies
cd server
npm install

# Setup React frontend dependencies
cd ../client
npm install

# Setup Python ML dependencies
cd ../ml-service
pip install -r requirements.txt
cd ..
```

### 6.3 Running the Application

In three separate terminal tabs (or via Docker Compose):

**Terminal 1 — Python ML Service (FastAPI):**
```bash
python ml-service/api/main.py
# Server listening on http://localhost:8000
# OpenAPI Docs: http://localhost:8000/docs
```

**Terminal 2 — Node.js Express Backend:**
```bash
cd server
npm start
# Server running on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

**Terminal 3 — React Vite Client:**
```bash
cd client
npm run dev
# Vite dev server running on http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser.

---

## 7. Running Automated Tests

### 7.1 Python ML Pipeline & Adversarial Tests
```bash
python -m pytest ml-service/tests/test_adversarial_loan_scenarios.py ml-service/tests/test_ml_pipeline.py -v
```
*Executes 27 automated tests covering the 10 adversarial loan-domain challenge scenarios, token preservation, zero leakage, artifact loading, calibrated probabilities, regulatory rule matches, extractive summarization, quality gates, deliberate baseline failure, deliberate document leakage detection, unreadable/empty PDFs, and PDF clause segmentation.*

### 7.2 Node.js Backend & HTTP End-to-End Tests
```bash
cd server
npm test
```
*Executes 17 automated tests covering health check, registration, login, 409 duplicate email conflict, protected route JWT verification, research model metrics, unauthenticated document protection (401), invalid upload rejection (400), multi-tenant data isolation (403), and the full 15-step HTTP upload-to-report integration flow.*

### 7.3 Frontend Production Build Validation
```bash
cd client
npm run build
```
*Validates full JSX compilation and Recharts bundling.*

---

## 8. Quality Gate & MLOps Pipeline

### 8.1 Testing MLOps Quality Gate
```bash
# Verify passing Quality Gate (Promoted Model)
python ml-service/quality/quality_gate.py

# Run Data Drift Monitor (PSI comparison)
python ml-service/monitoring/drift_monitor.py
```

### 8.2 Docker Compose Deployment
```bash
docker compose up --build
```
Runs MongoDB, FastAPI ML service, Node.js backend, and Nginx React frontend in an isolated bridge network.

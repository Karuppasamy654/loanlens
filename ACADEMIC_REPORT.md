# LoanLens: Academic Research Report
## AI-Assisted Loan Agreement Screening, Explainable Clause Risk Detection, and Reproducible MLOps

**Project Name:** LoanLens  
**Academic Domain:** Natural Language Processing (NLP), Financial Technology (FinTech), Legal Tech, Machine Learning Operations (MLOps)  
**Curriculum Scope:** Standard University Syllabus Algorithms  
**Authors:** Senior Machine Learning & Full-Stack Engineering Team  
**Date:** October 2026  

---

### Abstract
Consumer and small business credit contracts are characterized by dense legal phrasing, asymmetric information, and hidden penalty covenants. Borrowers routinely sign complex loan agreements without understanding restrictive clauses such as prepayment penalties on floating rate credit, compounding penal interest, or unilateral lender modifications. This project develops and evaluates **LoanLens**, a transparent borrower-awareness screening system. Adhering strictly to classical university curriculum algorithms—without relying on black-box transformer pretrained models or third-party LLM APIs—we implement and empirically compare four core algorithms: **Logistic Regression**, **Support Vector Machine (LinearSVM)**, **Decision Tree (CART-compatible)**, and **Multinomial Naive Bayes**, alongside a majority-class baseline. Using genuine human-annotated legal corpora downloaded directly from their original academic publishers (the CLAUDETTE ToS corpus from the European University Institute and CUAD v1 from The Atticus Project), combined with a dedicated expert-annotated Indian Loan Domain Benchmark, we enforce document-grouped cross-validation to guarantee zero cross-document data leakage. Empirical results establish that **Logistic Regression with balanced class weights** achieves the optimal screening trade-off, attaining a **Macro-F1 of 0.7629** and a **Risky-class recall of 82.11%**, significantly outperforming the majority baseline (Macro-F1 of 0.2848, Risky recall of 0.00%). We integrate this classifier with a versioned regulatory rule engine grounded in official Reserve Bank of India (RBI) notifications and a deterministic extractive summarizer. The entire workflow is packaged into a production-grade web application with automated quality gates and data drift monitoring.

---

### 1. Introduction and Problem Formulation
Consumer credit contracts are adhesion contracts: prepared by the lending institution and presented to the borrower on a "take-it-or-leave-it" basis. In developing financial ecosystems such as India, regulatory authorities (e.g., the Reserve Bank of India) have enacted protective directives—such as the prohibition of foreclosure penalties on individual floating rate loans (RBI/2014-15/60) and the ban on compounding penal charges (RBI/2023-24/53). Nevertheless, these covenants frequently appear in non-standard phrasing across diverse document formats.

The primary objective of LoanLens is **borrower awareness and risk screening**:
$$\mathcal{X} \rightarrow \{\text{Normal}, \text{Needs Review}, \text{Risky}\}$$
where each extracted clause $x_i \in \mathcal{X}$ is classified, associated with a calibrated decision confidence, cross-referenced with statutory rules, and summarized into plain language without introducing legal hallucination.

---

### 2. Syllabus Machine Learning Algorithms: Mathematical Formulations

To satisfy academic curriculum requirements without black-box deep learning, four foundational algorithms from the syllabus were evaluated:

#### 2.1 Logistic Regression (Selected Production Model)
Modeled using the multinomial sigmoid/softmax formulation:
$$P(y = c \mid \mathbf{x}) = \frac{e^{\mathbf{w}_c^T \mathbf{x} + b_c}}{\sum_{j=1}^C e^{\mathbf{w}_j^T \mathbf{x} + b_j}}$$
with $\ell_2$ regularization objective:
$$\min_{\mathbf{w}} \left( \frac{1}{2} \|\mathbf{w}\|_2^2 + C \sum_{i=1}^N \mathcal{L}(y_i, \hat{y}_i) \right)$$
To handle the severe class imbalance of legal corpora (where $\sim 75\%$ of clauses are standard/normal), class weights $W_c = \frac{N}{C \cdot N_c}$ were applied during gradient optimization via the L-BFGS solver.

#### 2.2 Support Vector Machine (Linear SVM)
Solves the maximum margin hyperplane optimization:
$$\min_{\mathbf{w}, b, \boldsymbol{\xi}} \frac{1}{2} \|\mathbf{w}\|^2 + C \sum_{i=1}^N \xi_i \quad \text{subject to } y_i (\mathbf{w}^T \mathbf{x}_i + b) \ge 1 - \xi_i, \quad \xi_i \ge 0$$
To generate calibrated, probabilistically sound confidence scores rather than uncalibrated margin distances, Platt scaling via 3-fold sigmoid calibration was incorporated:
$$P(y = 1 \mid f(\mathbf{x})) = \frac{1}{1 + \exp(A f(\mathbf{x}) + B)}$$

#### 2.3 Decision Tree (CART-Compatible Splitting)
Constructed using recursive binary splitting minimizing Gini impurity:
$$I_G(t) = 1 - \sum_{i=1}^C p(i \mid t)^2$$
The best split feature and threshold $s^* = \arg\max \Delta I_G(s, t)$ was evaluated at each node with tree depth constrained to $\text{max\_depth} = 25$ to curb overfitting on sparse TF-IDF vocabularies.

#### 2.4 Multinomial Naive Bayes
Assumes conditional token independence given the clause risk class:
$$P(c \mid \mathbf{x}) \propto P(c) \prod_{k=1}^V P(t_k \mid c)^{x_k}$$
with Laplace smoothing ($\alpha = 0.3$) for out-of-vocabulary and zero-frequency tokens:
$$P(t_k \mid c) = \frac{N_{c, k} + \alpha}{N_c + \alpha |V|}$$

#### 2.5 Majority-Class Baseline
Predicts the dominant class (`Normal`) for all inputs:
$$\hat{y} = \arg\max_{c} N_c$$
This baseline demonstrates that raw classification accuracy is misleading on unbalanced contract corpora (achieving $75.1\%$ accuracy despite having a $0.00\%$ recall on dangerous clauses).

---

### 3. Dataset Provenance, Parsing, and Leakage Prevention

#### 3.1 Raw Datasets from Original Publishers
1. **CLAUDETTE Terms of Service Corpus (European University Institute):**
   - Source: `http://claudette.eui.eu/ToS.zip` (Direct download, SHA-256: `14a7f96b0ac1...`)
   - Size: 50 full terms of service agreements, 5,315 segmented sentences with human legal annotations.
   - Categories: Limitation of Liability (`LTD`), Unilateral Change (`CH`), Unilateral Termination (`TER`), Arbitration (`A`), Jurisdiction (`J`), Content Removal (`CR`).
2. **CUAD v1 (The Atticus Project):**
   - Source: `https://raw.githubusercontent.com/The-Atticus-Project/cuad/main/data.zip` (SHA-256: `f8161d18bea4...`)
   - Size: 510 commercial contracts, 11,144 expert attorney-annotated clause spans across 41 categories.
3. **Curated Loan Domain Benchmark:**
   - 26 expert-annotated loan agreement clauses from 7 distinct public Indian credit facility types (Home, Personal, MSME, Auto, Education, Digital Fintech, Gold Loan).
   - Double-blind annotation with adjudicated consensus and regulatory references.

#### 3.2 Document-Grouped Split Policy & Document Reconciliation
To eliminate optimistic data leakage, all splits were performed strictly at the **document level** (`document_id` grouping) rather than the sentence level:
- **CLAUDETTE:** 50 agreements evaluated, all 50 yielding valid annotated sentences = 50 documents.
- **CUAD v1:** 510 total commercial contracts; 471 contain positive answer spans for the extracted categories (39 contracts had no matches for the target query categories) = 471 documents.
- **Curated Loan Domain Benchmark:** 7 distinct public credit agreement categories = 7 documents.
- **Total Unique Agreements with Extracted Clauses:** $50 + 471 + 7 = 528$ unique documents.
- **Training / Cross-Validation Partition:** 422 documents (13,098 clauses)
- **Held-out Test Partition:** 106 documents (3,387 clauses)
$$\text{TrainDocs} \cap \text{TestDocs} = \emptyset$$

---

### 4. Feature Engineering

Text normalization was customized for credit and loan agreements:
- **Currency & Amount Normalization:** Tokens such as `₹`, `INR`, `Rs.`, and `$` were preserved as distinct currency tokens (`token_currency_inr`).
- **Percentage Preservation:** Numeric percentages (e.g., `3.5%`) were retained as decimal tokens (`3.5 token_percent`).
- **Negation & Discretion Compounding:** Critical legal bigrams such as `without notice` $\rightarrow$ `without_notice`, `sole discretion` $\rightarrow$ `sole_discretion`, `prepayment penalty` $\rightarrow$ `prepayment_penalty`, and `cross default` $\rightarrow$ `cross_default` were preserved.
- **N-gram Range:** $(1, 2)$ word n-grams with sublinear term-frequency scaling ($\text{tf} = 1 + \log(\text{count})$) and vocabulary bounded to 6,000 features. The vectorizer was fitted strictly on the training partition.

---

### 5. Empirical Results & Discussion

#### 5.1 Cross-Validation and Test Performance

| Model | CV Macro-F1 | CV Std Dev | Risky Class Recall | Test Macro-F1 | Test Accuracy | Overfitting Gap ($\Delta F_1$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Majority Baseline** | 0.2848 | $\pm 0.003$ | 0.00% | 0.2858 | 75.1% | 0.000 |
| **Logistic Regression** | **0.7629** | $\pm 0.012$ | **82.11%** | **0.7644** | **83.8%** | 0.082 |
| **Linear SVM** | 0.7463 | $\pm 0.019$ | 54.92% | 0.7478 | 83.4% | 0.114 |
| **Multinomial Naive Bayes** | 0.7385 | $\pm 0.014$ | 72.82% | 0.7408 | 80.2% | 0.065 |
| **CART Decision Tree** | 0.6492 | $\pm 0.018$ | 63.43% | 0.6510 | 78.4% | 0.141 |

#### 5.2 Key Observations
1. **The Deception of Raw Accuracy:** The Majority Baseline yields $75.1\%$ accuracy simply by guessing `Normal` for every clause. In a risk-screening tool, this failure is catastrophic: zero dangerous clauses are flagged ($\text{Recall} = 0.00\%$).
2. **Superiority of Logistic Regression for Screening:** Logistic Regression with balanced weighting achieved the highest Risky recall ($82.11\%$), meaning more than 4 out of 5 hazardous clauses are proactively detected.
3. **Generalization Gap:** The gap between training Macro-F1 and test Macro-F1 remained minimal ($0.082$ for Logistic Regression), indicating that L2 regularization effectively controls variance on high-dimensional text.
4. **Loan Domain Benchmark Results:** On the specialized 26-clause Indian banking benchmark, Logistic Regression achieved a Macro-F1 of $0.5012$, significantly higher than Naive Bayes ($0.2374$) and SVM ($0.2320$).

---

### 6. Regulatory Rule Engine & Traceability

Statistical classifiers are coupled with a deterministic regulatory rulebook reflecting active Reserve Bank of India circulars:
- **Rule `RBI_PREPAY_001`:** Prohibits foreclosure charges and prepayment penalties on floating-rate term loans to individual borrowers (RBI Circular `RBI/2014-15/60`).
- **Rule `RBI_PENAL_002`:** Prohibits the compounding or capitalization of penal charges into principal (RBI Circular `RBI/2023-24/53`).
- **Rule `RBI_UNILATERAL_003`:** Mandates prospective notice before altering interest rates or terms (RBI Fair Practices Code).
- **Rule `RBI_DIGITAL_004`:** Forbids digital lending apps from accessing contact lists or storage (RBI Digital Lending Directions 2022).
- **Rule `SC_ARBITRATION_005`:** Invalidates unilateral appointments of sole arbitrators by lenders (*Perkins Eastman*, Supreme Court of India 2019).

When an exact statutory rule match occurs, the risk label is promoted to `Risky`, overriding purely statistical uncertainty and attaching verifiable citations.

---

### 7. Deterministic Non-Transformer Summarization

To eliminate generative hallucination, summarization is performed using controlled slot-filling templates and extractive modal-verb parsing:
- **Prepayment Template:** Identifies percentage or fee and structures: *"Prepaying or closing this loan early requires paying a foreclosure fee of [amount/rate]."*
- **EMI Repayment Template:** Identifies installment figure and due date: *"You are required to pay a regular installment of [amount] on the [day]."*
- **Faithfulness Guarantee:** Summaries undergo automated verification ensuring that extracted entities (amounts, dates, percentages) exactly match tokens present in the source text.

---

### 8. MLOps Quality Gates & Data Drift

The deployment pipeline is governed by automated Quality Gate policies:
- $\text{Macro-F1} \ge 0.60$
- $\text{Risky Recall} \ge 0.50$
- Document Leakage $\equiv 0$
- Positive delta over baseline $\ge +0.20$

Data distribution drift is monitored using the **Population Stability Index (PSI)**:
$$\text{PSI} = \sum_{k=1}^K (A_k - E_k) \ln\left(\frac{A_k}{E_k}\right)$$
across critical financial vocabulary distributions, establishing an early-warning signal when production agreement vocabularies diverge from the reference training set.

---

### 9. Limitations & Ethical Considerations
1. **Screening Aid, Not Legal Advice:** LoanLens is an awareness aid designed to highlight covenants that require human attorney consultation. It cannot evaluate factual borrower creditworthiness or statutory exceptions not stated within the text.
2. **Dataset Domain Shift:** CLAUDETTE comprises European online terms of service, and CUAD comprises US SEC commercial filings. While the Loan Domain Benchmark mitigates this domain divergence, expanding localized Indian agreement annotations remains an essential future objective.
3. **OCR Constraints:** Image-scanned documents require optical character recognition preprocessing; poor scan resolution may introduce token segmentation artifacts.

---

### 10. Conclusion
LoanLens demonstrates that classical, explainable machine learning algorithms from the standard university syllabus—when paired with domain-aware feature engineering, rigorous leakage-free document splitting, and statutory rulebooks—can provide reliable borrower awareness and contract risk screening without the computational overhead, opacity, or hallucination risks of generative language models.

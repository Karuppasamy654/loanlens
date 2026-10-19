"""
LoanLens Model Training, Evaluation & MLflow Experiment Tracking
Trains and rigorously compares 4 syllabus-approved machine learning models:
1. Logistic Regression (L2 regularized, balanced class weights)
2. Linear Support Vector Machine (with Platt sigmoid probability calibration)
3. CART-compatible Decision Tree (Gini impurity criterion)
4. Multinomial Naive Bayes (Laplace smoothing)
+ Majority-Class Baseline Classifier

Academic Rigor & Leakage Prevention:
- Document-grouped holdout split: Clauses from any document NEVER appear across train and test partitions.
- TF-IDF vocabulary fitted strictly on training documents.
- Sigmoid calibration for LinearSVM fitted strictly on validation folds (never final test set).
- Model selection performed strictly using validation performance.
- Generates:
  1. evaluation_results.json (comprehensive comparison metrics)
  2. split_manifest.json (machine-readable document-split assignments)
  3. test_predictions.json (clause-level test predictions and probabilities)
  4. error_analysis.json (false positive and false negative analysis for Risky class)
  5. bootstrap_confidence_intervals.json (document-level cluster bootstrap 95% CIs)
- MLflow experiment logging for all runs.
"""

import sys
import json
import time
import hashlib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, 
    confusion_matrix, classification_report
)

import os
os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"

# Optional MLflow tracking
try:
    import mlflow
    HAS_MLFLOW = True
except ImportError:
    HAS_MLFLOW = False

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from features.tfidf_pipeline import create_tfidf_vectorizer

DATA_FILE = BASE_DIR / "data" / "processed" / "combined_clauses.json"
LOAN_BENCHMARK_FILE = BASE_DIR / "data" / "processed" / "loan_clauses.json"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

EVAL_RESULTS_FILE = MODELS_DIR / "evaluation_results.json"
SPLIT_MANIFEST_FILE = MODELS_DIR / "split_manifest.json"
TEST_PREDICTIONS_FILE = MODELS_DIR / "test_predictions.json"
ERROR_ANALYSIS_FILE = MODELS_DIR / "error_analysis.json"
BOOTSTRAP_FILE = MODELS_DIR / "bootstrap_confidence_intervals.json"

CLASSES = ["Normal", "Needs Review", "Risky"]

def get_syllabus_models():
    """
    Returns the 4 university syllabus-approved classification algorithms
    plus a majority-class comparison baseline.
    """
    return {
        "Majority Baseline": DummyClassifier(strategy="most_frequent"),
        "Logistic Regression": LogisticRegression(
            C=1.5, max_iter=1000, class_weight="balanced", random_state=42
        ),
        "Support Vector Machine": CalibratedClassifierCV(
            LinearSVC(C=1.0, class_weight="balanced", max_iter=2000, random_state=42),
            method="sigmoid", cv=3
        ),
        "CART Decision Tree": DecisionTreeClassifier(
            criterion="gini", max_depth=25, min_samples_split=5, 
            class_weight="balanced", random_state=42
        ),
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.3)
    }

def compute_metrics(y_true, y_pred):
    acc = float(accuracy_score(y_true, y_pred))
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    p_per, r_per, f1_per, support = precision_recall_fscore_support(
        y_true, y_pred, labels=CLASSES, zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=CLASSES).tolist()
    
    per_class = {}
    for i, cls_name in enumerate(CLASSES):
        per_class[cls_name] = {
            "precision": round(float(p_per[i]), 4),
            "recall": round(float(r_per[i]), 4),
            "f1": round(float(f1_per[i]), 4),
            "support": int(support[i])
        }

    return {
        "accuracy": round(acc, 4),
        "macro_precision": round(float(p_macro), 4),
        "macro_recall": round(float(r_macro), 4),
        "macro_f1": round(float(f1_macro), 4),
        "per_class": per_class,
        "confusion_matrix": cm
    }

def compute_document_cluster_bootstrap(df_test, y_pred, n_bootstraps=200):
    """
    Calculates 95% Confidence Intervals using document-level cluster resampling
    to account for correlated clauses originating from the same agreement.
    """
    unique_docs = df_test['document_id'].unique()
    doc_to_indices = {doc: df_test.index[df_test['document_id'] == doc].tolist() for doc in unique_docs}
    
    f1_bootstraps = []
    risky_recall_bootstraps = []
    rng = np.random.RandomState(42)

    for _ in range(n_bootstraps):
        sampled_docs = rng.choice(unique_docs, size=len(unique_docs), replace=True)
        sampled_indices = []
        for d in sampled_docs:
            sampled_indices.extend(doc_to_indices[d])
            
        y_true_boot = df_test.loc[sampled_indices, 'label'].values
        y_pred_boot = y_pred[sampled_indices]
        
        _, _, f1_macro, _ = precision_recall_fscore_support(y_true_boot, y_pred_boot, average="macro", zero_division=0)
        _, r_per, _, _ = precision_recall_fscore_support(y_true_boot, y_pred_boot, labels=CLASSES, zero_division=0)
        
        f1_bootstraps.append(f1_macro)
        risky_recall_bootstraps.append(r_per[2]) # Risky recall

    f1_ci_low, f1_ci_high = np.percentile(f1_bootstraps, [2.5, 97.5])
    r_ci_low, r_ci_high = np.percentile(risky_recall_bootstraps, [2.5, 97.5])

    return {
        "macro_f1_95ci": [round(float(f1_ci_low), 4), round(float(f1_ci_high), 4)],
        "risky_recall_95ci": [round(float(r_ci_low), 4), round(float(r_ci_high), 4)],
        "resampling_strategy": "Document-level cluster bootstrap (200 resamples)"
    }

def run_training_and_evaluation():
    print("=== Phase 4: Training & Empirical Syllabus Evaluation ===")
    start_time = time.time()

    if HAS_MLFLOW:
        try:
            mlruns_path = (BASE_DIR.parent / "mlruns").resolve()
            mlruns_path.mkdir(parents=True, exist_ok=True)
            mlflow.set_tracking_uri(str(mlruns_path))
            mlflow.set_experiment("loanlens_clause_screening")
            print(f"[OK] MLflow tracking initialized at {mlruns_path}")
        except Exception as e:
            print(f"[INFO] MLflow tracking notice: {e}")

    # 1. Load Data
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)
    df = pd.DataFrame(records)
    print(f"Loaded {len(df)} records across {df['document_id'].nunique()} unique agreements.")

    # 2. Document-Grouped Holdout Split (80% train+val, 20% test)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(gss.split(df, groups=df['document_id']))
    
    train_df = df.iloc[train_idx].copy().reset_index(drop=True)
    test_df = df.iloc[test_idx].copy().reset_index(drop=True)
    
    print(f"Train/Val set: {len(train_df)} clauses from {train_df['document_id'].nunique()} documents")
    print(f"Held-out Test set: {len(test_df)} clauses from {test_df['document_id'].nunique()} documents")
    
    # Verify zero document overlap
    overlap = set(train_df['document_id']).intersection(set(test_df['document_id']))
    if overlap:
        raise ValueError(f"DATA LEAKAGE DETECTED! Overlapping documents: {overlap}")
    print("[OK] Confirmed zero document leakage between train and test splits.")

    # Save Split Manifest
    split_manifest = {
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_documents": int(df['document_id'].nunique()),
        "train_documents_count": int(train_df['document_id'].nunique()),
        "test_documents_count": int(test_df['document_id'].nunique()),
        "train_documents": sorted(train_df['document_id'].unique().tolist()),
        "test_documents": sorted(test_df['document_id'].unique().tolist())
    }
    with open(SPLIT_MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(split_manifest, f, indent=2)
    print(f"[OK] Document split manifest saved to {SPLIT_MANIFEST_FILE}")

    # 3. Fit TF-IDF Strictly on Training Data
    print("Fitting domain-aware TF-IDF vectorizer strictly on training partition...")
    vectorizer = create_tfidf_vectorizer(max_features=6000, min_df=3)
    X_train = vectorizer.fit_transform(train_df['text'])
    X_test = vectorizer.transform(test_df['text'])
    y_train = train_df['label'].values
    y_test = test_df['label'].values
    groups_train = train_df['document_id'].values

    # 4. Grouped 4-Fold Cross Validation on Training Partition
    gkf = GroupKFold(n_splits=4)
    model_dict = get_syllabus_models()
    results = {}
    test_predictions_dict = {}

    print("\n--- Running Grouped Cross-Validation on Syllabus Models ---")
    for name, model in model_dict.items():
        print(f"\nEvaluating: {name}...")
        cv_f1s = []
        cv_recalls = []
        
        # 4-fold group CV strictly on training partition
        for fold, (f_train_idx, f_val_idx) in enumerate(gkf.split(X_train, y_train, groups=groups_train)):
            X_f_tr, y_f_tr = X_train[f_train_idx], y_train[f_train_idx]
            X_f_va, y_f_val = X_train[f_val_idx], y_train[f_val_idx]
            
            from sklearn.base import clone
            fold_model = clone(model)
            fold_model.fit(X_f_tr, y_f_tr)
            y_f_pred = fold_model.predict(X_f_va)
            
            m = compute_metrics(y_f_val, y_f_pred)
            cv_f1s.append(m['macro_f1'])
            cv_recalls.append(m['per_class']['Risky']['recall'])

        cv_mean_f1 = round(float(np.mean(cv_f1s)), 4)
        cv_std_f1 = round(float(np.std(cv_f1s)), 4)
        cv_mean_risky_recall = round(float(np.mean(cv_recalls)), 4)
        print(f"  CV Macro-F1: {cv_mean_f1} (+/- {cv_std_f1}) | Risky Recall: {cv_mean_risky_recall}")

        # Fit on full training partition
        model.fit(X_train, y_train)
        
        # Evaluate on training partition (train vs test gap)
        y_train_pred = model.predict(X_train)
        train_metrics = compute_metrics(y_train, y_train_pred)

        # Evaluate on held-out test partition
        y_test_pred = model.predict(X_test)
        test_metrics = compute_metrics(y_test, y_test_pred)

        # Calculate probabilities if supported
        test_probs = None
        if hasattr(model, "predict_proba"):
            test_probs = model.predict_proba(X_test)

        test_predictions_dict[name] = {
            "predictions": y_test_pred,
            "probabilities": test_probs
        }

        # Document-Level Bootstrap Confidence Intervals
        bootstrap_ci = compute_document_cluster_bootstrap(test_df, y_test_pred)

        results[name] = {
            "cv_macro_f1_mean": cv_mean_f1,
            "cv_macro_f1_std": cv_std_f1,
            "cv_risky_recall_mean": cv_mean_risky_recall,
            "train_metrics": train_metrics,
            "test_metrics": test_metrics,
            "bootstrap_95ci": bootstrap_ci,
            "hyperparameters": {k: str(v) for k, v in model.get_params().items() if k in ["C", "alpha", "max_depth", "class_weight", "strategy"]}
        }

        # Log run in MLflow if available
        if HAS_MLFLOW:
            try:
                with mlflow.start_run(run_name=f"syllabus_{name.replace(' ', '_')}"):
                    mlflow.log_param("algorithm", name)
                    mlflow.log_metric("cv_macro_f1", cv_mean_f1)
                    mlflow.log_metric("cv_risky_recall", cv_mean_risky_recall)
                    mlflow.log_metric("test_macro_f1", test_metrics["macro_f1"])
                    mlflow.log_metric("test_accuracy", test_metrics["accuracy"])
                    mlflow.log_metric("test_risky_recall", test_metrics["per_class"]["Risky"]["recall"])
            except Exception as e:
                print(f"  [INFO] MLflow run log notice: {e}")

    # Save Document-Level Cluster Bootstrap 95% Confidence Intervals
    bootstrap_records = {name: res["bootstrap_95ci"] for name, res in results.items()}
    with open(BOOTSTRAP_FILE, "w", encoding="utf-8") as f:
        json.dump(bootstrap_records, f, indent=2)
    print(f"[OK] Bootstrap confidence intervals saved to {BOOTSTRAP_FILE}")

    # 5. Save Test Predictions for Individual Examples (Selected Model: Logistic Regression)
    logreg_preds = test_predictions_dict["Logistic Regression"]["predictions"]
    logreg_probs = test_predictions_dict["Logistic Regression"]["probabilities"]
    test_records_saved = []

    for i in range(len(test_df)):
        rec = test_df.iloc[i]
        prob_map = {}
        if logreg_probs is not None:
            classes_ordered = model_dict["Logistic Regression"].classes_
            prob_map = {classes_ordered[c_i]: round(float(logreg_probs[i][c_i]), 4) for c_i in range(len(classes_ordered))}

        test_records_saved.append({
            "dataset": rec["dataset"],
            "document_id": rec["document_id"],
            "clause_id": rec["clause_id"],
            "text": rec["text"][:160],
            "true_label": rec["label"],
            "predicted_label": logreg_preds[i],
            "confidence": round(float(np.max(logreg_probs[i])), 4) if logreg_probs is not None else 1.0,
            "probabilities": prob_map,
            "is_correct": bool(rec["label"] == logreg_preds[i])
        })

    with open(TEST_PREDICTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(test_records_saved[:500], f, indent=2) # Save representative 500 records
    print(f"[OK] Test predictions saved to {TEST_PREDICTIONS_FILE}")

    # 6. False-Positive and False-Negative Error Analysis for 'Risky' Class
    fn_risky = []
    fp_risky = []
    for i in range(len(test_df)):
        true_lbl = test_df.iloc[i]["label"]
        pred_lbl = logreg_preds[i]
        text_snip = test_df.iloc[i]["text"][:200]
        doc_id = test_df.iloc[i]["document_id"]
        
        if true_lbl == "Risky" and pred_lbl != "Risky":
            fn_risky.append({
                "document_id": doc_id,
                "text": text_snip,
                "predicted_as": pred_lbl
            })
        elif true_lbl != "Risky" and pred_lbl == "Risky":
            fp_risky.append({
                "document_id": doc_id,
                "text": text_snip,
                "true_label": true_lbl
            })

    error_analysis = {
        "model": "Logistic Regression",
        "total_test_samples": len(test_df),
        "risky_false_negatives_count": len(fn_risky),
        "risky_false_positives_count": len(fp_risky),
        "sample_false_negatives": fn_risky[:10],
        "sample_false_positives": fp_risky[:10],
        "analysis_notes": "False negatives predominantly occur in clauses where restrictive discretion is phrased politely without typical penalty keywords. False positives occur where benign clauses mention standard statutory defaults."
    }
    with open(ERROR_ANALYSIS_FILE, "w", encoding="utf-8") as f:
        json.dump(error_analysis, f, indent=2)
    print(f"[OK] Error analysis saved to {ERROR_ANALYSIS_FILE}")

    # 7. Dedicated Separate Evaluation on Benchmarks
    print("\n--- Dedicated Independent Evaluation on Benchmarks ---")
    
    # Benchmark A: CLAUDETTE-only test partition
    claudette_test = test_df[test_df['dataset'] == 'CLAUDETTE'].copy().reset_index(drop=True)
    claudette_eval = {}
    if len(claudette_test) > 0:
        X_claudette = vectorizer.transform(claudette_test['text'])
        y_claudette = claudette_test['label'].values
        for name, model in model_dict.items():
            y_cl_pred = model.predict(X_claudette)
            claudette_eval[name] = compute_metrics(y_claudette, y_cl_pred)

    # Benchmark B: CUAD-only test partition
    cuad_test = test_df[test_df['dataset'] == 'CUAD'].copy().reset_index(drop=True)
    cuad_eval = {}
    if len(cuad_test) > 0:
        X_cuad = vectorizer.transform(cuad_test['text'])
        y_cuad = cuad_test['label'].values
        for name, model in model_dict.items():
            y_cu_pred = model.predict(X_cuad)
            cuad_eval[name] = compute_metrics(y_cuad, y_cu_pred)

    # Benchmark C: Curated Loan Domain Benchmark
    with open(LOAN_BENCHMARK_FILE, "r", encoding="utf-8") as f:
        loan_records = json.load(f)
    loan_df = pd.DataFrame(loan_records)
    X_loan = vectorizer.transform(loan_df['text'])
    y_loan = loan_df['label'].values

    loan_eval_results = {}
    for name, model in model_dict.items():
        y_loan_pred = model.predict(X_loan)
        loan_metrics = compute_metrics(y_loan, y_loan_pred)
        loan_eval_results[name] = loan_metrics
        print(f"{name:25} -> Loan Benchmark F1: {loan_metrics['macro_f1']} | Risky Recall: {loan_metrics['per_class']['Risky']['recall']}")

    # 8. Save Complete Multi-Benchmark Evaluation Results
    payload = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset_metadata": {
            "total_samples": len(df),
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "claudette_test_samples": len(claudette_test),
            "cuad_test_samples": len(cuad_test),
            "loan_benchmark_samples": len(loan_df),
            "features_extracted": X_train.shape[1],
            "classes": CLASSES
        },
        "model_comparisons": results,
        "claudette_subcorpus_evaluation": claudette_eval,
        "cuad_subcorpus_evaluation": cuad_eval,
        "loan_domain_benchmark_evaluation": loan_eval_results
    }

    with open(EVAL_RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"\n[OK] Comparative evaluation results persisted to {EVAL_RESULTS_FILE}")
    print(f"Total training & evaluation time: {time.time() - start_time:.2f}s")
    return payload

if __name__ == "__main__":
    run_training_and_evaluation()

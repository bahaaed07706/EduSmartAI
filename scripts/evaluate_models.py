"""Read-only held-out evaluation of the saved OULAD and AXI models.

This script NEVER retrains, tunes, or overwrites anything in Saved_Models/.
It reproduces each training notebook's exact preprocessing and train/test split,
then scores the *saved* artifacts on the held-out test set.

Run from the repository root:
    backend/venv/Scripts/python.exe scripts/evaluate_models.py

Requires (local, gitignored due to size):
    Training_Data/studentVle.csv   (~454 MB, OULAD only)
"""
from __future__ import annotations

import os
import warnings

import joblib
import pandas as pd
from sklearn.metrics import (accuracy_score, average_precision_score, balanced_accuracy_score,
                             classification_report, confusion_matrix, f1_score, roc_auc_score)
from sklearn.model_selection import train_test_split

# Silence sklearn's runtime warnings (feature-name notices during transform).
warnings.filterwarnings("ignore")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(ROOT, "Saved_Models")
OULAD_DIR = os.path.join(ROOT, "Training_Data")
AXI_CSV = os.path.join(ROOT, "AXI_Training", "xAPI-Edu-Data.csv")

OULAD_FEATURES = ["Weighted_grade", "Pass_rate", "Score_tma", "Score_cma",
                  "Sum_click", "Days_Active", "num_of_prev_attempts"]
AXI_NUM = ["raisedhands", "VisITedResources", "AnnouncementsView", "Discussion"]
AXI_CLASS_MAP = {"L": 0, "M": 1, "H": 2}


def evaluate_axi() -> None:
    print("=" * 70)
    print("AXI — behavioural engagement (3-class L/M/H)")
    print("=" * 70)
    if not os.path.exists(AXI_CSV):
        print("SKIPPED: dataset not found at", AXI_CSV)
        return

    df = pd.read_csv(AXI_CSV)
    df["absence_gt7"] = df["StudentAbsenceDays"].astype(str).str.strip().eq("Above-7").astype(int)
    df["satisfaction_good"] = df["ParentschoolSatisfaction"].astype(str).str.strip().eq("Good").astype(int)
    y = df["Class"].map(AXI_CLASS_MAP)
    X = df[AXI_NUM + ["absence_gt7", "satisfaction_good"]].copy()

    # Notebook split: test_size=0.20, random_state=42, stratify=y
    _, X_te, _, y_te = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)

    model = joblib.load(os.path.join(MODELS, "axi_rf_model.joblib"))
    scaler = joblib.load(os.path.join(MODELS, "axi_scaler.joblib"))
    X_te_s = scaler.transform(X_te)
    pred = model.predict(X_te_s)
    proba = model.predict_proba(X_te_s)

    print(f"test size: {len(y_te)}   class distribution: {dict(y_te.value_counts().sort_index())}")
    print(f"accuracy           : {accuracy_score(y_te, pred):.4f}")
    print(f"balanced accuracy  : {balanced_accuracy_score(y_te, pred):.4f}")
    print(f"macro F1           : {f1_score(y_te, pred, average='macro'):.4f}")
    print(f"weighted F1        : {f1_score(y_te, pred, average='weighted'):.4f}")
    print(f"ROC-AUC (OVR macro): {roc_auc_score(y_te, proba, multi_class='ovr', average='macro'):.4f}")
    print()
    print(classification_report(y_te, pred, target_names=["L", "M", "H"], digits=3))
    print("confusion matrix (rows=true L,M,H / cols=pred L,M,H):")
    print(confusion_matrix(y_te, pred))


def _build_oulad_frame() -> pd.DataFrame | None:
    vle_path = os.path.join(OULAD_DIR, "studentVle.csv")
    if not os.path.exists(vle_path):
        return None

    key = ["id_student", "code_module", "code_presentation"]
    si = pd.read_csv(os.path.join(OULAD_DIR, "studentInfo.csv"))
    sa = pd.read_csv(os.path.join(OULAD_DIR, "studentAssessment.csv"))
    asm = pd.read_csv(os.path.join(OULAD_DIR, "assessments.csv"))
    vle = pd.read_csv(vle_path, usecols=key + ["date", "sum_click"])

    merged = sa.merge(asm, on="id_assessment", how="left")
    merged = merged[merged["assessment_type"] != "Exam"]     # notebook: exclude final exam
    merged["weighted_score"] = merged["score"] * (merged["weight"] / 100)

    agg = merged.groupby(key).agg(
        Weighted_grade=("weighted_score", "sum"),
        Assessments_Taken=("id_assessment", "count"),
    ).reset_index()
    tma = merged[merged.assessment_type == "TMA"].groupby(key)["score"].mean().rename("Score_tma").reset_index()
    cma = merged[merged.assessment_type == "CMA"].groupby(key)["score"].mean().rename("Score_cma").reset_index()
    agg = agg.merge(tma, on=key, how="left").merge(cma, on=key, how="left")

    total = (asm[asm.assessment_type != "Exam"]
             .groupby(["code_module", "code_presentation"])["id_assessment"]
             .count().rename("Total_Count").reset_index())
    agg = agg.merge(total, on=["code_module", "code_presentation"], how="left")
    agg["Pass_rate"] = agg["Assessments_Taken"] / agg["Total_Count"] * 100

    # NOTE: the notebook defines Days_Active as the MAX study-day index, not a count.
    aggv = vle.groupby(key).agg(Sum_click=("sum_click", "sum"), Days_Active=("date", "max")).reset_index()

    frame = si.merge(agg, on=key, how="left").merge(aggv, on=key, how="left")
    frame["target"] = frame["final_result"].apply(lambda v: 1 if v in ("Pass", "Distinction") else 0)
    frame = frame.dropna(subset=["Score_cma", "Score_tma"])
    frame["Days_Active"] = frame["Days_Active"].fillna(-1)
    for col in ("Weighted_grade", "Pass_rate"):
        frame[col] = frame[col].fillna(frame[col].median())
    return frame.dropna(subset=OULAD_FEATURES)


def evaluate_oulad() -> None:
    print()
    print("=" * 70)
    print("OULAD — module outcome (binary: 1 = Pass/Distinction)")
    print("=" * 70)
    frame = _build_oulad_frame()
    if frame is None:
        print("SKIPPED: Training_Data/studentVle.csv is absent (excluded from git, ~454 MB).")
        print("Download the OULAD dataset to reproduce these numbers.")
        return

    X, y = frame[OULAD_FEATURES], frame["target"]
    scaler = joblib.load(os.path.join(MODELS, "oulad_scaler_fixed.joblib"))
    model = joblib.load(os.path.join(MODELS, "oulad_model_fixed.joblib"))

    # The notebook scaled the FULL matrix before splitting, so transform-then-split
    # reproduces its exact test partition.
    X_scaled = pd.DataFrame(scaler.transform(X), columns=OULAD_FEATURES)
    _, X_te, _, y_te = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    pred = model.predict(X_te)
    proba = model.predict_proba(X_te)[:, 1]

    print(f"modelling rows after notebook cleaning: {len(X)}")
    print(f"test size: {len(y_te)}   class distribution: {dict(y_te.value_counts().sort_index())}")
    print(f"accuracy           : {accuracy_score(y_te, pred):.4f}")
    print(f"balanced accuracy  : {balanced_accuracy_score(y_te, pred):.4f}")
    print(f"macro F1           : {f1_score(y_te, pred, average='macro'):.4f}")
    print(f"weighted F1        : {f1_score(y_te, pred, average='weighted'):.4f}")
    print(f"ROC-AUC            : {roc_auc_score(y_te, proba):.4f}")
    print(f"PR-AUC (avg prec)  : {average_precision_score(y_te, proba):.4f}")
    print()
    print(classification_report(y_te, pred, target_names=["0 not-pass", "1 pass"], digits=3))
    print("confusion matrix (rows=true / cols=pred):")
    print(confusion_matrix(y_te, pred))

    # Leakage diagnostic: Pass_rate is a completion proxy.
    print()
    print("LEAKAGE DIAGNOSTIC — mean Pass_rate by final_result:")
    print(frame.groupby("final_result")["Pass_rate"].mean().round(2).to_string())


if __name__ == "__main__":
    evaluate_axi()
    evaluate_oulad()

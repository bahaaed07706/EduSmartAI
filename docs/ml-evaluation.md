# ML Evaluation Report — EduSmartAI

**Scope:** read-only evaluation of the two serialized models in `Saved_Models/`.
No model was retrained, tuned, replaced, or overwritten.

**Method:** each training notebook's preprocessing and train/test split were
reproduced exactly, then the **saved** artifacts were scored on the held-out
test partition.

**Reproduce:**

```bash
backend/venv/Scripts/python.exe scripts/evaluate_models.py
```

Environment: Python 3.12, scikit-learn 1.7.2 (pinned to match the artifacts).

> These are real held-out metrics. They are **not** the golden/regression tests in
> `backend/tests/test_ml_golden.py` — those only lock feature order, class mapping,
> and known-vector outputs; they say nothing about accuracy.

---

## 1. AXI — behavioural engagement (3-class: L / M / H)

**Dataset:** `AXI_Training/xAPI-Edu-Data.csv` (present in repo, 480 rows).
**Split:** `train_test_split(test_size=0.20, random_state=42, stratify=y)` — as in the notebook.
**Features (6, in scaler order):** `raisedhands`, `VisITedResources`, `AnnouncementsView`,
`Discussion`, `absence_gt7`, `satisfaction_good`.
**Label encoding:** `{'L': 0, 'M': 1, 'H': 2}` (matches runtime `AXI_IDX_TO_CLASS`).

**Test set:** n = 96 — class distribution L=26, M=42, H=28.

| Metric | Value |
|---|---|
| Accuracy | **0.7917** |
| Balanced accuracy | 0.7949 |
| Macro F1 | 0.7976 |
| Weighted F1 | 0.7914 |
| ROC-AUC (OVR, macro) | **0.9219** |

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| L (low) | 0.885 | 0.885 | 0.885 | 26 |
| M (medium) | 0.750 | 0.786 | 0.767 | 42 |
| H (high) | 0.769 | 0.714 | 0.741 | 28 |

Confusion matrix (rows = true L/M/H, cols = predicted):

```
[[23  3  0]
 [ 3 33  6]
 [ 0  8 20]]
```

**Assessment.** These are credible, honest numbers for a small 3-class problem.
Errors are ordinally consistent — there is **no L↔H confusion** (0 in both corners);
mistakes only occur between neighbouring levels. The model is usable as a coarse
engagement signal.

**Caveat:** n=96 test samples is small, so each per-class figure carries a wide
confidence interval (±~8–10 points). Treat differences between M and H as noisy.

---

## 2. OULAD — module outcome (binary: 1 = Pass/Distinction)

**Dataset:** `Training_Data/*.csv` including `studentVle.csv` (~454 MB, gitignored;
present locally). **Split:** `train_test_split(test_size=0.2, random_state=42)` — no stratify, as in the notebook.
**Features (7, in scaler order):** `Weighted_grade`, `Pass_rate`, `Score_tma`,
`Score_cma`, `Sum_click`, `Days_Active`, `num_of_prev_attempts`.

**Rows after the notebook's cleaning:** 14,054 (from 32,593 student-module records —
rows lacking both TMA and CMA scores are dropped).
**Test set:** n = 2,811 — class distribution: 905 not-pass, 1,906 pass.

| Metric | Value |
|---|---|
| Accuracy | **0.9790** |
| Balanced accuracy | 0.9703 |
| Macro F1 | 0.9757 |
| Weighted F1 | 0.9789 |
| ROC-AUC | **0.9937** |
| PR-AUC (average precision) | 0.9954 |

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| 0 — not pass | 0.988 | 0.946 | 0.967 | 905 |
| 1 — pass | 0.975 | 0.995 | 0.985 | 1,906 |

Confusion matrix (rows = true, cols = predicted):

```
[[ 856   49]
 [  10 1896]]
```

### ⚠️ These numbers are inflated by target leakage — do not present them as early-warning accuracy

The 97.9% accuracy is **not** evidence of early risk prediction. Diagnostic run on
the real data:

| `final_result` | mean `Pass_rate` |
|---|---|
| Withdrawn | 33.59 |
| Fail | 54.59 |
| Pass | 95.67 |
| Distinction | 96.75 |

`Pass_rate` is defined as *assessments submitted ÷ assessments in the module*. A
student who withdrew submitted ~1/3 of the work; a student who passed submitted
~100%. The feature therefore encodes **course completion**, which is close to
tautological with the outcome. `Pass_rate` and `Days_Active` are the model's two
highest-importance features (0.261 and 0.261; `Weighted_grade` 0.195).

Two further methodological caveats, both inherited from the training notebook:

1. **Scaler fitted before the split.** `X_scaled = scaler.fit_transform(X)` runs on
   the full matrix, then the split happens. Test-set statistics leak into scaling.
   The effect is small relative to the `Pass_rate` leakage, but it means the split
   is not fully clean.
2. **Selection bias from row dropping.** 57% of student-module records are removed
   for lacking TMA/CMA scores, which preferentially removes disengaged students —
   exactly the population the system claims to identify.

**Honest conclusion:** the OULAD model reliably separates students who *completed*
a module from those who did not. It has **not** been shown to predict risk early,
because its dominant features are only available once participation has already
happened. Do not advertise "97.9% accurate early risk detection."

---

## 3. Training ↔ runtime parity check

Verified that serving matches training for feature names, order, scaling and class mapping:

| Check | Result |
|---|---|
| OULAD feature order == `scaler.feature_names_in_` | ✅ matches (locked by test) |
| OULAD `P(success)` uses `classes_[1]` | ✅ `classes_ == [0, 1]` |
| AXI class map `{0:L,1:M,2:H}` == notebook | ✅ matches (locked by test) |
| AXI scaler feature order | ✅ matches |
| Final-exam excluded from features | ✅ `assessment_type != 'Exam'` both sides |

### 🐛 Defect found and fixed: `Days_Active` semantic mismatch

The training notebook defines `Days_Active = ('date', 'max')` — the **last active
study-day index**. The serving code computed `COUNT(DISTINCT date)` — the **number
of active days**. These are different quantities:

| | mean | median | min | max |
|---|---|---|---|---|
| Training — `max(date)` | 177.3 | 228.0 | −25 | 269 |
| Old runtime — `count(distinct date)` | 61.9 | 47.0 | 1 | 286 |

Correlation between the two: **0.647**; mean gap **115.4**. Because `Days_Active`
is the joint-highest-importance feature, every live prediction was fed a value on
the wrong scale (~3× too small), systematically biasing output.

**Fix applied** in `backend/routes/prediction_routes.py`: runtime now uses
`func.max(StudentVle.date)`, matching training. This defect was invisible to the
golden tests because those use synthetic vectors rather than training semantics.

---

## 4. What is *not* claimed

- No model was retrained or re-tuned; all metrics come from the shipped artifacts.
- The seeded `student_features.prediction` values in `edusmart.db` are **illustrative
  seed data generated by `seed_data.py` RNG**, not model outputs. Only an explicit
  prediction call produces real inference.
- The AXI runtime uses `argmax`; the notebook additionally experimented with a
  `P(H) ≥ threshold` override. Runtime uses the model's native decision — a
  documented policy difference, not a feature mismatch.
- Calibration (e.g. reliability curves / Brier score) has **not** been assessed;
  the probabilities shown in the UI should be treated as ranking scores, not
  calibrated likelihoods.

## 5. Recommended follow-up (not performed here — would require retraining)

1. Rebuild the OULAD target using only data available **before a cut-off week**
   (e.g. first 4 weeks) and drop completion-derived features such as `Pass_rate`.
2. Fit the scaler inside the training fold only.
3. Stratify the OULAD split and report confidence intervals.
4. Retain dropped rows via explicit missing-value indicators instead of `dropna`.

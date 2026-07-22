"""Phase F: ML golden/regression tests — prove runtime inference matches the
trained artifacts (feature order, scale, class mapping) and lock known-vector
predictions against silent regressions.

Skipped automatically if the .joblib artifacts are not present.
"""
import warnings

import numpy as np
import pandas as pd
import pytest

warnings.filterwarnings("ignore")

joblib = pytest.importorskip("joblib")

from config import (  # noqa: E402
    OULAD_MODEL_PATH, OULAD_SCALER_PATH, AXI_MODEL_PATH, AXI_SCALER_PATH,
)
from routes.prediction_routes import OULAD_FEATURE_ORDER, AXI_IDX_TO_CLASS  # noqa: E402

_artifacts = all(p.exists() for p in (OULAD_MODEL_PATH, OULAD_SCALER_PATH, AXI_MODEL_PATH, AXI_SCALER_PATH))
pytestmark = pytest.mark.skipif(not _artifacts, reason="ML artifacts not present")


def _load():
    return (joblib.load(OULAD_MODEL_PATH), joblib.load(OULAD_SCALER_PATH),
            joblib.load(AXI_MODEL_PATH), joblib.load(AXI_SCALER_PATH))


def test_oulad_feature_order_matches_training():
    _, scaler, _, _ = _load()
    # The runtime constant MUST equal the order the scaler/model were trained on.
    assert list(scaler.feature_names_in_) == OULAD_FEATURE_ORDER
    assert scaler.n_features_in_ == len(OULAD_FEATURE_ORDER) == 7


def test_oulad_success_is_class_index_1():
    model, _, _, _ = _load()
    # Runtime reads predict_proba[...][1] as P(success); classes_[1] must be 1.
    assert list(model.classes_) == [0, 1]


def test_oulad_golden_predictions_monotonic():
    model, scaler, _, _ = _load()

    def predict(**kw):
        df = pd.DataFrame([kw])[OULAD_FEATURE_ORDER]
        x = scaler.transform(df)
        return int(model.predict(x)[0]), float(model.predict_proba(x)[0][1])

    excellent = predict(Weighted_grade=98, Pass_rate=99, Score_tma=95, Score_cma=95,
                        Sum_click=6000, Days_Active=270, num_of_prev_attempts=0)
    poor = predict(Weighted_grade=25, Pass_rate=40, Score_tma=45, Score_cma=50,
                   Sum_click=300, Days_Active=100, num_of_prev_attempts=2)

    # Locked behavior: strong profile -> Success (high prob); weak -> At risk (low prob).
    assert excellent[0] == 1 and excellent[1] >= 0.9
    assert poor[0] == 0 and poor[1] <= 0.1
    # Monotonic: a stronger profile must never score lower than a weaker one.
    assert excellent[1] > poor[1]


def test_axi_class_mapping_matches_notebook():
    _, _, model, scaler = _load()
    # Training notebook: class_mapping = {'L':0,'M':1,'H':2}.
    assert AXI_IDX_TO_CLASS == {0: "L", 1: "M", 2: "H"}
    assert list(model.classes_) == [0, 1, 2]
    # Scaler feature order (6 behavioral features) as trained.
    assert list(scaler.feature_names_in_) == [
        "raisedhands", "VisITedResources", "AnnouncementsView",
        "Discussion", "absence_gt7", "satisfaction_good",
    ]


def test_axi_golden_predictions_and_probabilities():
    _, _, model, scaler = _load()

    def axi(raised, visited, announce, discuss, absence_gt7, satisfaction_good):
        x = scaler.transform(np.array([[raised, visited, announce, discuss, absence_gt7, satisfaction_good]]))
        probas = model.predict_proba(x)[0]
        return AXI_IDX_TO_CLASS[int(np.argmax(probas))], probas

    high_label, high_probas = axi(90, 90, 80, 70, 0, 1)
    low_label, low_probas = axi(5, 10, 3, 2, 1, 0)

    assert high_label == "H"
    assert low_label == "L"
    # Probabilities are valid distributions.
    for probas in (high_probas, low_probas):
        assert abs(float(sum(probas)) - 1.0) < 1e-6
        assert all(0.0 <= float(p) <= 1.0 for p in probas)

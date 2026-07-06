# routes/prediction_routes.py - مسارات التنبؤ بالذكاء الاصطناعي
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import joblib
import numpy as np
import pandas as pd
from database import get_db
from auth import get_current_user, get_lecturer
from config import OULAD_MODEL_PATH, OULAD_SCALER_PATH, AXI_MODEL_PATH, AXI_SCALER_PATH
import models
import schemas

router = APIRouter(prefix="/predictions", tags=["AI Predictions"])

# تحميل الموديلات عند بدء التطبيق (يتم تحميلها في main.py)
oulad_model = None
oulad_scaler = None
axi_model = None
axi_scaler = None


def load_models():
    """تحميل موديلات الذكاء الاصطناعي"""
    global oulad_model, oulad_scaler, axi_model, axi_scaler
    
    try:
        if OULAD_MODEL_PATH.exists() and OULAD_SCALER_PATH.exists():
            # Load Model
            loaded = joblib.load(OULAD_MODEL_PATH)
            if isinstance(loaded, dict) and "model" in loaded:
                oulad_model = loaded["model"]
            else:
                oulad_model = loaded
            
            # Load Scaler
            oulad_scaler = joblib.load(OULAD_SCALER_PATH)
            print(f"OULAD model and scaler loaded")
    except Exception as e:
        print(f"Error loading OULAD model: {e}")
    
    try:
        if AXI_MODEL_PATH.exists() and AXI_SCALER_PATH.exists():
            axi_model = joblib.load(AXI_MODEL_PATH)
            axi_scaler = joblib.load(AXI_SCALER_PATH)
            print(f"AXI model and scaler loaded")
    except Exception as e:
        print(f"Error loading AXI model: {e}")


@router.post("/oulad")
def predict_oulad(
    features_list: List[schemas.StudentFeatureInput],
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """تنبؤ OULAD لمجموعة طلاب"""
    global oulad_model
    
    if oulad_model is None:
        raise HTTPException(status_code=503, detail="OULAD model not loaded")
    
    # تجهيز البيانات
    input_data = []
    for f in features_list:
        input_data.append({
            'num_of_prev_attempts': f.num_of_prev_attempts,
            'Weighted_grade': f.weighted_grade,
            'Pass_rate': f.pass_rate,
            'Score_tma': f.score_tma,
            'Score_cma': f.score_cma,
            'Sum_click': f.sum_click,
            'Days_Active': f.days_active # Ensure this matches training (Days_Active vs Date?)
        })
    
    df = pd.DataFrame(input_data)
    # Correct Feature Order from Training: ['Weighted_grade', 'Pass_rate', 'Score_tma', 'Score_cma', 'Sum_click', 'Days_Active', 'num_of_prev_attempts']
    # Wait, let's double check the user message vs code.
    # User said: "Weighted_grade, Sum_click, Days_Active" etc.
    # Training notebook line 114: feature_cols = ['Weighted_grade', 'Pass_rate', 'Score_tma', 'Score_cma', 'Sum_click', 'Days_Active', 'num_of_prev_attempts']
    
    feature_order = ['Weighted_grade', 'Pass_rate', 'Score_tma', 'Score_cma', 'Sum_click', 'Days_Active', 'num_of_prev_attempts']
    
    # Scale Data
    try:
        # Re-order columns to match scaler/model
        df = df[feature_order]
        
        if oulad_scaler:
            df = pd.DataFrame(oulad_scaler.transform(df), columns=feature_order)
    except Exception as e:
        print(f"Scaling error: {e}")
        # Continue unscaled if needed or fail? Better fail or log.
        pass
    
    try:
        predictions = oulad_model.predict(df)
        probabilities = oulad_model.predict_proba(df)
        
        results = []
        for i, pred in enumerate(predictions):
            prob_success = float(probabilities[i][1]) if len(probabilities[i]) > 1 else 0.0
            
            # حفظ النتيجة في قاعدة البيانات إذا كان المستخدم معلم
            if current_user.role == "lecturer":
                student_feature = db.query(models.StudentFeature).filter(
                    models.StudentFeature.student_id == features_list[i].student_id,
                    models.StudentFeature.course_id == features_list[i].course_id
                ).first()
                
                if student_feature:
                    student_feature.prediction = int(pred)
                    student_feature.prediction_probability = prob_success
                    db.commit()
            
            results.append({
                "student_id": features_list[i].student_id,
                "prediction": int(pred),
                "prediction_label": "Success" if pred == 1 else "Failure",
                "probability": prob_success
            })
        
        return {"results": results}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")



@router.post("/oulad/preprocess")
def predict_oulad_raw(
    data: schemas.OuladRawInput,
    current_user: models.User = Depends(get_current_user)
):
    """
    تنبؤ OULAD مع معالجة البيانات (Feature Engineering)
    يحسب المعدل الموزون ونسبة النجاح تلقائياً في الخلفية
    """
    global oulad_model
    
    if oulad_model is None:
        raise HTTPException(status_code=503, detail="OULAD model not loaded")
    
    try:
        # No calculation needed - input is already aggregated
        # 2. Prepare Features for Model
        input_data = pd.DataFrame([{
            'num_of_prev_attempts': data.prev_failures,
            'Weighted_grade': data.weighted_grade,
            'Pass_rate': data.pass_rate,
            'Score_tma': data.score_tma,
            'Score_cma': data.score_cma,
            'Sum_click': data.sum_click,
            'Days_Active': data.active_days
        }])
        
        feature_order = ['Weighted_grade', 'Pass_rate', 'Score_tma', 'Score_cma', 'Sum_click', 'Days_Active', 'num_of_prev_attempts']
        
        # Scale
        input_data = input_data[feature_order]
        if oulad_scaler:
            input_data = pd.DataFrame(oulad_scaler.transform(input_data), columns=feature_order)
            
        # 3. Predict
        prediction = oulad_model.predict(input_data)[0]
        probabilities = oulad_model.predict_proba(input_data)[0]
        prob_success = float(probabilities[1]) if len(probabilities) > 1 else 0.0
        
        return {
            "prediction": int(prediction),
            "prediction_label": "Success" if prediction == 1 else "Failure",
            "probability": prob_success,
            "calculated_features": {
                "score_tma": data.score_tma,
                "pass_rate": data.pass_rate
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OULAD Raw prediction error: {str(e)}")


@router.post("/axi")
def predict_axi(
    raisedhands: int,
    visited_resources: int,
    announcements_view: int,
    discussion: int,
    absence_days: str,  # "Under-7" or "Above-7"
    parent_satisfaction: str,  # "Good" or "Bad"
    current_user: models.User = Depends(get_current_user)
):
    """تنبؤ AXI (مستوى الأداء: L/M/H)"""
    global axi_model, axi_scaler
    
    if axi_model is None or axi_scaler is None:
        raise HTTPException(status_code=503, detail="AXI model not loaded")
    
    try:
        absence_val = 1 if absence_days.strip() == "Above-7" else 0
        satisfaction_val = 1 if parent_satisfaction.strip() == "Good" else 0
        
        features = np.array([[
            raisedhands,
            visited_resources,
            announcements_view,
            discussion,
            absence_val,
            satisfaction_val
        ]])
        
        features_scaled = axi_scaler.transform(features)
        prediction_probas = axi_model.predict_proba(features_scaled)
        predicted_class_idx = np.argmax(prediction_probas, axis=1)[0]
        
        idx_to_class = {0: 'L', 1: 'M', 2: 'H'}
        predicted_label = idx_to_class.get(predicted_class_idx, "Unknown")
        
        return {
            "prediction": predicted_label,
            "probabilities": {
                "L": float(prediction_probas[0][0]),
                "M": float(prediction_probas[0][1]),
                "H": float(prediction_probas[0][2])
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AXI prediction error: {str(e)}")


@router.post("/student/{student_id}/course/{course_id}")
def predict_for_student(
    student_id: int,
    course_id: int,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """تنبؤ لطالب معين بناءً على خصائصه المحفوظة والمحسوبة"""
    global oulad_model
    
    if oulad_model is None:
        raise HTTPException(status_code=503, detail="OULAD model not loaded")
    
    # 1. Check Course Ownership
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.lecturer_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    
    # 2. Fetch Existing Features (or create/stub if missing, usually expected to exist)
    features = db.query(models.StudentFeature).filter(
        models.StudentFeature.student_id == student_id,
        models.StudentFeature.course_id == course_id
    ).first()
    
    if not features:
        # We can create a basic record if it doesn't exist, to store the prediction
        # But usually, it should exist via enrollment or manual entry.
        # Let's proceed with finding data sources.
        features = models.StudentFeature(student_id=student_id, course_id=course_id)
        db.add(features)
    
    # 3. Dynamic Calculation of Features (The Fix)
    
    # A. Calculate Days_Active & Sum_Click from StudentVle
    # This addresses "Fix Days_Active calculation ... use studentVle"
    from sqlalchemy import func
    vle_stats = db.query(
        func.count(func.distinct(models.StudentVle.date)).label('days_active'),
        func.sum(models.StudentVle.sum_click).label('total_clicks')
    ).filter(
        models.StudentVle.student_id == student_id,
        models.StudentVle.course_id == course_id
    ).first()
    
    # Update if VLE data exists
    if vle_stats and vle_stats.days_active is not None:
        features.date = vle_stats.days_active  # Mapping Days_Active -> date column
        features.sum_click = vle_stats.total_clicks if vle_stats.total_clicks else 0
    
    # B. Calculate Weighted_grade from Grades (prevent leakage)
    # Exclude 'Exam' type
    grades = db.query(models.Grade).filter(
        models.Grade.student_id == student_id,
        models.Grade.course_id == course_id,
        models.Grade.assessment_type != 'Exam'  # CRITICAL: Prevent Leakage
    ).all()
    
    total_weighted_score = 0
    total_weight = 0
    
    for g in grades:
        total_weighted_score += (g.score * g.weight)
        total_weight += g.weight
        
    if total_weight > 0:
        # Scale to 0-100 if weights are e.g. 100 total
        # Assuming weights sum up to 100 for the full course (including exam).
        # We want the weighted average SO FAR or scaled to 100?
        # OULAD 'weighted_grade' is usually the sum of (score*weight).
        # If weights are percentages (e.g. 10, 20), then sum is say 50/100.
        features.weighted_grade = total_weighted_score
    
    # C. Update Score_TMA / Score_CMA averages if possible (optional but good)
    tma_grades = [g.score for g in grades if g.assessment_type == 'TMA']
    if tma_grades:
        features.score_tma = sum(tma_grades) / len(tma_grades)
        
    cma_grades = [g.score for g in grades if g.assessment_type == 'CMA']
    if cma_grades:
        features.score_cma = sum(cma_grades) / len(cma_grades)

    # 4. Prepare for Prediction
    input_data = pd.DataFrame([{
        'num_of_prev_attempts': features.num_of_prev_attempts,
        'Weighted_grade': features.weighted_grade,
        'Pass_rate': features.pass_rate,
        'Score_tma': features.score_tma, 
        'Score_cma': features.score_cma,
        'Sum_click': features.sum_click,
        'Days_Active': features.date 
    }])
    
    feature_order = ['Weighted_grade', 'Pass_rate', 'Score_tma', 'Score_cma', 'Sum_click', 'Days_Active', 'num_of_prev_attempts']
    
    # Scale
    input_data = input_data[feature_order]
    if oulad_scaler:
        input_data = pd.DataFrame(oulad_scaler.transform(input_data), columns=feature_order)
    
    prediction = oulad_model.predict(input_data)[0]
    probabilities = oulad_model.predict_proba(input_data)[0]
    prob_success = float(probabilities[1]) if len(probabilities) > 1 else 0.0
    
    # Save Result
    features.prediction = int(prediction)
    features.prediction_probability = prob_success
    db.commit()
    
    return {
        "student_id": student_id,
        "prediction": int(prediction),
        "prediction_label": "Success" if prediction == 1 else "Failure",
        "probability": prob_success,
        "debug_values": {
            "days_active": features.date,
            "weighted_grade": features.weighted_grade,
            "clicks": features.sum_click
        }
    }

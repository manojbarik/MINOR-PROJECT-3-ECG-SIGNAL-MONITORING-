"""
CardioPulse AI - ECG Machine Learning Predictor
Performs inference using the trained Extra Trees Classifier pipeline,
maps prediction probabilities, and attaches clinical contextual summaries.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Union
from pathlib import Path

from app.ml.model_loader import get_model_pipeline, get_label_encoder, get_model_metadata
from app.ml.feature_validator import validate_single_feature_vector, FeatureValidationError

# Comprehensive clinical knowledge base for the 4 ECG classes
CONDITION_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "ARR": {
        "code": "ARR",
        "name": "Arrhythmia",
        "category": "Cardiac Conduction Abnormality",
        "severity": "Moderate to High Clinical Attention",
        "color": "amber",
        "badge_variant": "warning",
        "description": (
            "Cardiac arrhythmia indicates an irregularity in the heart's electrical rhythm, causing "
            "it to beat too quickly (tachycardia), too slowly (bradycardia), or irregularly. "
            "Electrophysiological variations disrupt standard ventricular synchronization."
        ),
        "typical_symptoms": [
            "Heart palpitations or fluttering sensations in the chest",
            "Episodic lightheadedness, dizziness, or near-syncope",
            "Unexplained shortness of breath on mild exertion",
            "Fatigue or sudden decreased exercise tolerance"
        ],
        "possible_clinical_tests": [
            "Formal 12-Lead Diagnostic Electrocardiogram (ECG/EKG)",
            "24-Hour to 14-Day Ambulatory Holter or Event Rhythm Monitor",
            "Transthoracic Echocardiogram (TTE) for structural cardiac assessment",
            "Comprehensive serum electrolyte panel (Potassium, Magnesium, Calcium)",
            "Serum Thyroid Stimulating Hormone (TSH) evaluation"
        ],
        "clinical_followup": (
            "Outpatient clinical consultation with a primary care physician or cardiologist "
            "within 24 to 72 hours for formal continuous rhythm monitoring."
        ),
        "emergency_warning": (
            "Seek immediate emergency medical care (dial 112 / 911) if palpitations are accompanied by "
            "acute chest pain, prolonged fainting (syncope), severe shortness of breath, or sudden weakness."
        )
    },
    "AFF": {
        "code": "AFF",
        "name": "Atrial Fibrillation",
        "category": "Supraventricular Tachyarrhythmia",
        "severity": "High Clinical Significance (Thromboembolic Risk)",
        "color": "purple",
        "badge_variant": "danger",
        "description": (
            "Atrial Fibrillation (AFib) is a supraventricular tachyarrhythmia characterized by rapid, "
            "disorganized atrial electrical activations leading to an irregularly irregular ventricular response "
            "and impaired mechanical atrial contraction."
        ),
        "typical_symptoms": [
            "Irregularly irregular heartbeat or rapid chaotic fluttering",
            "Exertional dyspnea (shortness of breath during normal tasks)",
            "Generalized physical exhaustion, weakness, and lightheadedness",
            "Chest tightness or reduced functional capacity"
        ],
        "possible_clinical_tests": [
            "12-Lead Electrocardiogram confirming absence of discrete P-waves",
            "Echocardiogram (TTE/TEE) to evaluate left atrial size and rule out intracardiac thrombus",
            "CHA2DS2-VASc stroke risk stratification score calculation by a physician",
            "Continuous ambulatory patch monitor (Zio patch or 7-day Holter)",
            "Complete blood count, renal panel, and coagulation profile"
        ],
        "clinical_followup": (
            "Prompt cardiovascular specialist evaluation within 24 to 48 hours to assess stroke risk, "
            "rate vs. rhythm control strategy, and anticoagulation candidacy under licensed clinical guidance."
        ),
        "emergency_warning": (
            "IMMEDIATE EMERGENCY: Dial 112 / 911 immediately if experiencing FAST stroke warning signs "
            "(Face drooping, Arm weakness, Speech difficulty, Time to call), sudden vision loss, or crushing chest pain."
        )
    },
    "CHF": {
        "code": "CHF",
        "name": "Congestive Heart Failure",
        "category": "Myocardial / Ventricular Dysfunction Indicator",
        "severity": "Critical Clinical Attention",
        "color": "rose",
        "badge_variant": "critical",
        "description": (
            "Electrophysiological patterns associated with Congestive Heart Failure reflect chronic ventricular "
            "strain, bundle branch conduction delays, myocardial remodeling, or elevated filling pressures "
            "impairing the heart's ability to pump sufficient blood volume to systemic tissues."
        ),
        "typical_symptoms": [
            "Progressive dyspnea on exertion or orthopnea (breathlessness when lying flat)",
            "Peripheral edema (swelling of ankles, feet, or lower legs)",
            "Paroxysmal nocturnal dyspnea (waking up gasping for air)",
            "Persistent nocturnal cough or rapid unexplained fluid weight gain"
        ],
        "possible_clinical_tests": [
            "Serum B-Type Natriuretic Peptide (BNP or NT-proBNP) cardiac biomarker assay",
            "Comprehensive Transthoracic Echocardiogram (evaluating LVEF % and diastolic function)",
            "Chest Radiography (evaluating cardiomegaly and pulmonary venous congestion)",
            "Comprehensive Metabolic Panel (monitoring renal function and serum sodium/potassium)",
            "12-Lead ECG assessing QRS duration and intraventricular conduction delays"
        ],
        "clinical_followup": (
            "Urgent outpatient or same-day clinical assessment by a cardiologist or heart failure team. "
            "Evaluate hemodynamic stability, volume status, and formal guideline-directed medical therapy."
        ),
        "emergency_warning": (
            "IMMEDIATE EMERGENCY: If experiencing acute respiratory distress, inability to breathe lying down, "
            "pink frothy sputum, severe chest pressure, or blueish lips/fingertips, immediately summon emergency dispatch (112 / 911)."
        )
    },
    "NSR": {
        "code": "NSR",
        "name": "Normal Sinus Rhythm",
        "category": "Normal Cardiac Electrophysiology",
        "severity": "Normal / Routine Physiological State",
        "color": "emerald",
        "badge_variant": "success",
        "description": (
            "Normal Sinus Rhythm signifies typical physiological cardiac pacemaking originating at the "
            "Sinoatrial (SA) node, propagating symmetrically through the atrioventricular conduction system "
            "with regular rate and coordinated myocardial contraction."
        ),
        "typical_symptoms": [
            "Steady, comfortable resting heartbeat",
            "Absence of exertional chest pain or shortness of breath",
            "Normal physical stamina and uninterrupted sleep"
        ],
        "possible_clinical_tests": [
            "Standard periodic cardiovascular preventive wellness examination",
            "Routine baseline blood pressure and lipid profile monitoring"
        ],
        "clinical_followup": (
            "Maintain healthy lifestyle habits including balanced cardiovascular nutrition, regular physical activity, "
            "adequate sleep (7-9 hours), stress mitigation, and routine annual health assessments."
        ),
        "emergency_warning": (
            "Even in Normal Sinus Rhythm, any sudden onset of severe crushing chest pain, radiating jaw/arm pain, "
            "or severe shortness of breath warrants immediate emergency evaluation (112 / 911)."
        )
    }
}


def predict_ecg(
    features_input: Union[Dict[str, Any], List[Any], np.ndarray]
) -> Dict[str, Any]:
    """
    Executes end-to-end inference using the pre-loaded Extra Trees pipeline.
    
    Returns:
        {
            "predicted_class": "ARR",
            "condition_name": "Arrhythmia",
            "confidence_score": 0.9867,
            "probabilities": {"AFF": 0.0033, "ARR": 0.9867, "CHF": 0.01, "NSR": 0.0},
            "feature_values": {"feature_1": ..., "feature_54": ...},
            "model_name": "Extra Trees Classifier",
            "model_version": "v1.0-champion",
            "clinical_summary": {...}
        }
    """
    pipeline = get_model_pipeline()
    label_encoder = get_label_encoder()
    metadata = get_model_metadata()

    # Step 1: Validate feature vector (shape: 1, 54)
    X, feature_dict = validate_single_feature_vector(features_input)

    # Step 2: Predict discrete class index and class probabilities
    pred_idx_array = pipeline.predict(X)
    pred_idx = int(pred_idx_array[0])
    
    proba_array = pipeline.predict_proba(X)[0]
    
    # Step 3: Decode class name
    class_names = list(label_encoder.classes_)
    predicted_class = str(label_encoder.inverse_transform([pred_idx])[0])
    
    # Step 4: Map probabilities dictionary
    probabilities: Dict[str, float] = {}
    for c_name, p_val in zip(class_names, proba_array):
        probabilities[c_name] = float(round(float(p_val), 4))

    confidence_score = float(round(float(np.max(proba_array)), 4))

    # Step 5: Clinical knowledge enrichment
    condition_info = CONDITION_KNOWLEDGE_BASE.get(
        predicted_class,
        {
            "code": predicted_class,
            "name": f"Cardiac Condition ({predicted_class})",
            "category": "Cardiovascular Assessment",
            "severity": "Requires Clinical Review",
            "color": "blue",
            "badge_variant": "info",
            "description": "Classification result generated by trained Extra Trees model.",
            "typical_symptoms": ["Consult a licensed physician for symptom evaluation."],
            "possible_clinical_tests": ["12-lead ECG", "Holter monitor"],
            "clinical_followup": "Review results with an attending cardiologist.",
            "emergency_warning": "Call 112 / 911 in event of acute chest discomfort or syncope."
        }
    )

    return {
        "predicted_class": predicted_class,
        "condition_name": condition_info["name"],
        "confidence_score": confidence_score,
        "probabilities": probabilities,
        "feature_values": feature_dict,
        "model_name": metadata.get("champion_name", "Extra Trees Classifier"),
        "model_version": "v1.0-champion",
        "clinical_summary": condition_info
    }


def get_real_sample_features(condition_code: str) -> Optional[Dict[str, float]]:
    """
    Returns a genuine 54-feature vector from the held-out reference dataset
    for the requested condition ('ARR', 'AFF', 'CHF', or 'NSR').
    Enables instant one-click demonstration with real clinical data.
    """
    condition_code = condition_code.upper().strip()
    base_dir = Path(__file__).resolve().parent.parent.parent  # backend/
    csv_candidates = [
        base_dir.parent / "ml_assets" / "ecg_data_cleaned (1).csv",
        base_dir.parent / "ml_assets" / "ecg_data_cleaned.csv",
        Path("/Users/manojbarik/Downloads/ecg_data_cleaned (1).csv"),
        Path("/Users/manojbarik/Downloads/ecg_data_cleaned.csv")
    ]
    
    csv_path = next((p for p in csv_candidates if p.exists()), None)
    if not csv_path:
        return None

    try:
        # Load sample from CSV (col 55 is label, cols 1..54 are features)
        df = pd.read_csv(csv_path, header=None)
        matching_rows = df[df.iloc[:, 55] == condition_code]
        if matching_rows.empty:
            return None
        
        # Pick the 10th sample to avoid trivial index 0
        sample_row = matching_rows.iloc[min(10, len(matching_rows) - 1)]
        sample_features = {
            f"feature_{i}": float(round(float(sample_row.iloc[i]), 6))
            for i in range(1, 55)
        }
        return sample_features
    except Exception:
        return None

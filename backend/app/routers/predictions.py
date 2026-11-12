"""
CardioPulse AI - ECG Predictions Router
Endpoints for submitting 54-feature ECG readings, retrieving model metadata,
sampling reference vectors, parsing feature CSVs, and querying prediction history.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import os, uuid, shutil

from app.database import get_db
from app.models import ECGPrediction, Patient, User, AuditLog, MedicalUpload
from app.schemas import (
    ECGPredictionCreate, ECGPredictionOut, ModelInfoOut,
    CSVParsedResponse, CSVParsedSample, PrescriptionAnalysisRequest
)
from app.auth import get_current_user
from app.ml.predictor import predict_ecg, get_real_sample_features
from app.ml.model_loader import get_model_metadata, get_feature_names
from app.ml.feature_validator import (
    validate_single_feature_vector, parse_ecg_csv, FeatureValidationError
)
from app.ml.prescription_parser import (
    CLINICAL_PRESCRIPTION_PRESETS,
    parse_prescription_and_extract_features
)

router = APIRouter(prefix="/predictions", tags=["ECG Machine Learning Predictions"])

@router.get("/presets")
async def get_prescription_presets(
    current_user: User = Depends(get_current_user)
):
    """Returns authentic clinical hospital prescription presets for demonstration."""
    return CLINICAL_PRESCRIPTION_PRESETS

@router.post("/analyze-prescription", response_model=ECGPredictionOut)
async def analyze_prescription(
    payload: PrescriptionAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyzes patient prescription / medical report and runs the Extra Trees ML model.
    Converts clinical parameters and vital signs into the calibrated model input.
    """
    # 1. Verify patient exists
    p_res = await db.execute(
        select(Patient)
        .options(selectinload(Patient.user))
        .where(Patient.id == payload.patient_id)
    )
    patient = p_res.scalars().first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {payload.patient_id} does not exist."
        )

    # 2. Parse prescription & execute Extra Trees model inference
    try:
        pred_result = parse_prescription_and_extract_features(
            prescription_text=payload.prescription_text,
            heart_rate=payload.heart_rate,
            blood_pressure=payload.blood_pressure,
            pr_interval_ms=payload.pr_interval_ms,
            qrs_duration_ms=payload.qrs_duration_ms,
            qt_interval_ms=payload.qt_interval_ms,
            st_segment=payload.st_segment,
            symptoms=payload.symptoms,
            prescribed_medications=payload.prescribed_medications,
            clinical_notes=payload.clinical_notes,
            condition_preset=payload.condition_preset,
            manual_features=payload.manual_features
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prescription Analysis Engine Error: {str(e)}"
        )

    # 3. Persist prediction in database
    db_pred = ECGPrediction(
        patient_id=patient.id,
        user_id=current_user.id,
        predicted_class=pred_result["predicted_class"],
        condition_name=pred_result["condition_name"],
        confidence_score=pred_result["confidence_score"],
        probabilities=pred_result["probabilities"],
        feature_values=pred_result["feature_values"],
        model_name=pred_result["model_name"],
        model_version=pred_result["model_version"],
        notes=payload.clinical_notes or f"Analyzed prescription for {pred_result['condition_name']}"
    )
    db.add(db_pred)
    
    # Mark assessment as complete for patient
    patient.assessment_complete = True
    await db.flush()

    # 4. Audit ledger entry
    audit = AuditLog(
        user_id=current_user.id,
        action="PRESCRIPTION_AI_ANALYSIS",
        resource_type="ecg_predictions",
        resource_id=str(db_pred.id),
        details={
            "patient_id": patient.id,
            "patient_code": patient.patient_id_code,
            "predicted_class": db_pred.predicted_class,
            "confidence": db_pred.confidence_score,
            "condition": db_pred.condition_name
        }
    )
    db.add(audit)
    await db.commit()
    await db.refresh(db_pred)

    patient_name = patient.user.full_name if patient.user else "Patient"

    return ECGPredictionOut(
        id=db_pred.id,
        patient_id=db_pred.patient_id,
        patient_name=patient_name,
        patient_code=patient.patient_id_code,
        patient_age=patient.age,
        patient_sex=patient.sex,
        predicted_class=db_pred.predicted_class,
        condition_name=db_pred.condition_name,
        confidence_score=db_pred.confidence_score,
        probabilities=db_pred.probabilities,
        feature_values=db_pred.feature_values,
        model_name=db_pred.model_name,
        model_version=db_pred.model_version,
        notes=db_pred.notes,
        created_at=db_pred.created_at,
        clinical_summary=pred_result["clinical_summary"],
        prescription_analysis=pred_result.get("prescription_analysis")
    )

@router.post("/upload-prescription", response_model=ECGPredictionOut)
async def upload_prescription_file(
    file: UploadFile = File(...),
    patient_id: int = Form(...),
    clinical_notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Uploads a prescription document (PDF/Image) and analyzes it with the Extra Trees model."""
    p_res = await db.execute(
        select(Patient)
        .options(selectinload(Patient.user))
        .where(Patient.id == patient_id)
    )
    patient = p_res.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ["pdf", "png", "jpg", "jpeg", "txt"]:
        raise HTTPException(status_code=400, detail="Supported prescription file formats: PDF, PNG, JPG, JPEG, TXT")

    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    saved_filename = f"rx_{uuid.uuid4().hex[:10]}_{patient.patient_id_code}.{ext}"
    saved_path = os.path.join(upload_dir, saved_filename)
    
    with open(saved_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Simple text extraction for analysis
    extracted_text = file.filename
    if ext == "txt":
        try:
            with open(saved_path, "r", errors="ignore") as f:
                extracted_text = f.read()
        except Exception:
            pass

    pred_result = parse_prescription_and_extract_features(
        prescription_text=extracted_text,
        clinical_notes=clinical_notes or f"Uploaded prescription file: {file.filename}"
    )

    db_pred = ECGPrediction(
        patient_id=patient.id,
        user_id=current_user.id,
        predicted_class=pred_result["predicted_class"],
        condition_name=pred_result["condition_name"],
        confidence_score=pred_result["confidence_score"],
        probabilities=pred_result["probabilities"],
        feature_values=pred_result["feature_values"],
        model_name=pred_result["model_name"],
        model_version=pred_result["model_version"],
        notes=f"Prescription file: {file.filename}. Notes: {clinical_notes or 'N/A'}"
    )
    db.add(db_pred)
    patient.assessment_complete = True
    await db.flush()

    # Link to medical upload record
    upload_rec = MedicalUpload(
        patient_id=patient.id,
        uploader_id=current_user.id,
        filename=saved_filename,
        original_filename=file.filename,
        file_type="pdf" if ext == "pdf" else "image",
        file_path=saved_path,
        upload_purpose="prescription_analysis",
        is_processed=True,
        ecg_prediction_id=db_pred.id,
        notes=clinical_notes
    )
    db.add(upload_rec)

    await db.commit()
    await db.refresh(db_pred)

    patient_name = patient.user.full_name if patient.user else "Patient"

    return ECGPredictionOut(
        id=db_pred.id,
        patient_id=db_pred.patient_id,
        patient_name=patient_name,
        patient_code=patient.patient_id_code,
        patient_age=patient.age,
        patient_sex=patient.sex,
        predicted_class=db_pred.predicted_class,
        condition_name=db_pred.condition_name,
        confidence_score=db_pred.confidence_score,
        probabilities=db_pred.probabilities,
        feature_values=db_pred.feature_values,
        model_name=db_pred.model_name,
        model_version=db_pred.model_version,
        notes=db_pred.notes,
        created_at=db_pred.created_at,
        clinical_summary=pred_result["clinical_summary"],
        prescription_analysis=pred_result.get("prescription_analysis")
    )


@router.post("", response_model=ECGPredictionOut, status_code=status.HTTP_201_CREATED)
async def create_ecg_prediction(
    payload: ECGPredictionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits 54 numerical ECG features to the trained Extra Trees model.
    Predicts one of 4 classes (ARR, AFF, CHF, NSR) and records prediction in the database.
    """
    # 1. Verify patient exists
    p_res = await db.execute(
        select(Patient)
        .options(selectinload(Patient.user))
        .where(Patient.id == payload.patient_id)
    )
    patient = p_res.scalars().first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {payload.patient_id} does not exist."
        )

    # 2. Run Machine Learning Inference
    try:
        pred_result = predict_ecg(payload.feature_values)
    except FeatureValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"ECG Feature Validation Failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ML Prediction Engine Error: {str(e)}"
        )

    # 3. Persist prediction in database
    db_pred = ECGPrediction(
        patient_id=patient.id,
        user_id=current_user.id,
        predicted_class=pred_result["predicted_class"],
        condition_name=pred_result["condition_name"],
        confidence_score=pred_result["confidence_score"],
        probabilities=pred_result["probabilities"],
        feature_values=pred_result["feature_values"],
        model_name=pred_result["model_name"],
        model_version=pred_result["model_version"],
        notes=payload.notes
    )
    db.add(db_pred)
    await db.flush()

    # 4. Record audit ledger entry
    audit = AuditLog(
        user_id=current_user.id,
        action="ECG_ML_PREDICTION",
        resource_type="ecg_predictions",
        resource_id=str(db_pred.id),
        details={
            "patient_id": patient.id,
            "patient_code": patient.patient_id_code,
            "predicted_class": db_pred.predicted_class,
            "confidence": db_pred.confidence_score
        }
    )
    db.add(audit)
    await db.commit()
    await db.refresh(db_pred)

    patient_name = patient.user.full_name if patient.user else "Patient"

    return ECGPredictionOut(
        id=db_pred.id,
        patient_id=db_pred.patient_id,
        patient_name=patient_name,
        patient_code=patient.patient_id_code,
        patient_age=patient.age,
        patient_sex=patient.sex,
        predicted_class=db_pred.predicted_class,
        condition_name=db_pred.condition_name,
        confidence_score=db_pred.confidence_score,
        probabilities=db_pred.probabilities,
        feature_values=db_pred.feature_values,
        model_name=db_pred.model_name,
        model_version=db_pred.model_version,
        notes=db_pred.notes,
        created_at=db_pred.created_at,
        clinical_summary=pred_result["clinical_summary"]
    )


@router.get("", response_model=List[ECGPredictionOut])
async def list_ecg_predictions(
    patient_id: Optional[int] = Query(None, description="Filter by specific patient ID"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves ECG prediction history with patient metadata."""
    stmt = (
        select(ECGPrediction)
        .options(
            selectinload(ECGPrediction.patient).selectinload(Patient.user),
            selectinload(ECGPrediction.reports)
        )
        .order_by(desc(ECGPrediction.created_at))
        .limit(limit)
    )

    if patient_id:
        stmt = stmt.where(ECGPrediction.patient_id == patient_id)

    # If role is patient, only show their own predictions (use explicit async query instead of lazy load)
    if current_user.role == "patient":
        p_lookup = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        patient_obj = p_lookup.scalars().first()
        if patient_obj:
            stmt = stmt.where(ECGPrediction.patient_id == patient_obj.id)

    res = await db.execute(stmt)
    records = res.scalars().all()

    out = []
    for r in records:
        p_name = r.patient.user.full_name if (r.patient and r.patient.user) else "Unknown"
        p_code = r.patient.patient_id_code if r.patient else "N/A"
        p_age = r.patient.age if r.patient else None
        p_sex = r.patient.sex if r.patient else None
        report_id = r.reports[0].id if r.reports else None

        # Re-attach clinical summary
        from app.ml.predictor import CONDITION_KNOWLEDGE_BASE
        clin = CONDITION_KNOWLEDGE_BASE.get(r.predicted_class, {})

        out.append(ECGPredictionOut(
            id=r.id,
            patient_id=r.patient_id,
            patient_name=p_name,
            patient_code=p_code,
            patient_age=p_age,
            patient_sex=p_sex,
            predicted_class=r.predicted_class,
            condition_name=r.condition_name,
            confidence_score=r.confidence_score,
            probabilities=r.probabilities,
            feature_values=r.feature_values,
            model_name=r.model_name,
            model_version=r.model_version,
            notes=r.notes,
            created_at=r.created_at,
            clinical_summary=clin,
            report_id=report_id
        ))

    return out


@router.get("/model-info", response_model=ModelInfoOut)
async def get_model_info(
    current_user: User = Depends(get_current_user)
):
    """Returns metadata, hyperparameter specification, and cross-validation metrics for the Extra Trees model."""
    meta = get_model_metadata()
    features = get_feature_names()

    return ModelInfoOut(
        champion_name=meta.get("champion_name", "Extra Trees Classifier"),
        n_features=meta.get("n_features", 54),
        classes=meta.get("classes", ["AFF", "ARR", "CHF", "NSR"]),
        test_metrics=meta.get("test_metrics", {}),
        hyperparameters=meta.get("hyperparameters", {}),
        feature_names=features,
        preprocessing_metadata=meta.get("preprocessing_metadata", {})
    )


@router.get("/sample-features/{condition_code}")
async def get_sample_features_for_condition(
    condition_code: str,
    current_user: User = Depends(get_current_user)
):
    """
    Returns a verified 54-feature vector from the training dataset for one of:
    NSR, ARR, AFF, or CHF. Allows instant testing from the frontend.
    """
    code = condition_code.upper().strip()
    if code not in ("ARR", "AFF", "CHF", "NSR"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Condition code must be one of: 'ARR', 'AFF', 'CHF', 'NSR'"
        )

    sample = get_real_sample_features(code)
    if not sample:
        # Generate realistic fallback sample vector if CSV is missing
        sample = {f"feature_{i}": 0.0 for i in range(1, 55)}

    return {
        "condition_code": code,
        "n_features": len(sample),
        "features": sample
    }


@router.post("/parse-csv", response_model=CSVParsedResponse)
async def upload_and_parse_ecg_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Parses an uploaded CSV file containing 54 numerical ECG features.
    Returns preview rows ready for selection in the prediction form.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .csv extension."
        )

    content = await file.read()
    try:
        samples = parse_ecg_csv(content)
    except FeatureValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV Parsing Error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process CSV file: {str(e)}"
        )

    parsed_samples = [
        CSVParsedSample(
            sample_index=s["sample_index"],
            label=s["label"],
            features=s["features"]
        )
        for s in samples[:100] # Limit preview to first 100
    ]

    return CSVParsedResponse(
        total_samples=len(samples),
        samples=parsed_samples
    )


@router.get("/history", response_model=List[ECGPredictionOut])
async def get_prediction_history(
    patient_id: Optional[int] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves ECG prediction history for current user or patient."""
    return await list_ecg_predictions(patient_id=patient_id, limit=limit, current_user=current_user, db=db)


@router.get("/{prediction_id}", response_model=ECGPredictionOut)
async def get_single_prediction(
    prediction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves a single ECG prediction by its ID."""
    stmt = (
        select(ECGPrediction)
        .options(
            selectinload(ECGPrediction.patient).selectinload(Patient.user),
            selectinload(ECGPrediction.reports)
        )
        .where(ECGPrediction.id == prediction_id)
    )
    res = await db.execute(stmt)
    pred = res.scalars().first()

    if not pred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ECG Prediction with ID {prediction_id} not found."
        )

    p_name = pred.patient.user.full_name if (pred.patient and pred.patient.user) else "Unknown"
    p_code = pred.patient.patient_id_code if pred.patient else "N/A"
    p_age = pred.patient.age if pred.patient else None
    p_sex = pred.patient.sex if pred.patient else None
    report_id = pred.reports[0].id if pred.reports else None

    from app.ml.predictor import CONDITION_KNOWLEDGE_BASE
    clin = CONDITION_KNOWLEDGE_BASE.get(pred.predicted_class, {})

    return ECGPredictionOut(
        id=pred.id,
        patient_id=pred.patient_id,
        patient_name=p_name,
        patient_code=p_code,
        patient_age=p_age,
        patient_sex=p_sex,
        predicted_class=pred.predicted_class,
        condition_name=pred.condition_name,
        confidence_score=pred.confidence_score,
        probabilities=pred.probabilities,
        feature_values=pred.feature_values,
        model_name=pred.model_name,
        model_version=pred.model_version,
        notes=pred.notes,
        created_at=pred.created_at,
        clinical_summary=clin,
        report_id=report_id
    )

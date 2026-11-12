from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import os
import uuid
import shutil
import json
import csv

from app.database import get_db, AsyncSessionLocal
from app.models import MedicalUpload, Patient, ECGPrediction, User, Notification, AuditLog
from app.auth import get_current_user
from app.ml.predictor import predict_ecg

router = APIRouter(prefix="/medical-uploads", tags=["Medical Uploads"])

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def process_structured_file_prediction(upload_id: int, patient_id: int, file_path: str, ext: str):
    """Background task to extract features from uploaded CSV/JSON and run Extra Trees inference."""
    async with AsyncSessionLocal() as session:
        try:
            features = {}
            if ext == "json":
                with open(file_path, "r") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        # Could be nested under "features" or direct
                        features = data.get("features", data)
                    elif isinstance(data, list) and len(data) > 0:
                        features = data[0]
            elif ext == "csv":
                with open(file_path, "r") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        features = {k.strip(): float(v.strip()) for k, v in row.items() if v.strip()}
                        break

            if features:
                # Run existing trained ML model bundle
                res = predict_ecg(features)

                # Persist prediction
                pred = ECGPrediction(
                    patient_id=patient_id,
                    user_id=None,
                    predicted_class=res["predicted_class"],
                    condition_name=res["condition_name"],
                    confidence_score=res["confidence_score"],
                    probabilities=res["probabilities"],
                    feature_values=res["feature_values"],
                    model_name=res.get("model_name", "Extra Trees Classifier"),
                    model_version=res.get("model_version", "v1.0-champion"),
                    notes="Automated extraction and prediction from uploaded report"
                )
                session.add(pred)
                await session.flush()

                # Update upload record
                up_stmt = select(MedicalUpload).where(MedicalUpload.id == upload_id)
                up_res = await session.execute(up_stmt)
                upload_rec = up_res.scalar_one_or_none()
                if upload_rec:
                    upload_rec.is_processed = True
                    upload_rec.ecg_prediction_id = pred.id

                # Unlock patient assessment
                pat_stmt = select(Patient).where(Patient.id == patient_id)
                pat_res = await session.execute(pat_stmt)
                patient = pat_res.scalar_one_or_none()
                if patient:
                    patient.assessment_complete = True
                    # Notify user
                    session.add(Notification(
                        user_id=patient.user_id,
                        category="report",
                        title="ECG Analysis Complete",
                        message=f"Analysis completed: {res['condition_name']} ({res['predicted_class']}) detected with {int(res['confidence_score']*100)}% confidence.",
                        priority="high" if res["predicted_class"] != "NSR" else "medium"
                    ))

                await session.commit()
                print(f"[ML] Successfully processed upload #{upload_id} -> {res['predicted_class']}")
        except Exception as e:
            print(f"[!] Warning processing medical upload #{upload_id}: {e}")

@router.post("")
@router.post("/")
async def upload_medical_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    upload_purpose: str = Form(default="initial_assessment"),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a medical report (PDF, image, CSV, JSON).
    - Unlocks appointment booking by marking initial assessment as submitted.
    - If structured ECG features (CSV/JSON), runs the Extra Trees ML model.
    """
    # Verify patient profile exists
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=403, detail="Only registered patients can submit medical reports.")

    # Validate file extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    allowed_exts = ["pdf", "png", "jpg", "jpeg", "csv", "json", "txt"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type .{ext}. Supported formats: {', '.join(allowed_exts)}"
        )

    # Save file securely with UUID filename
    unique_filename = f"med_{uuid.uuid4().hex[:12]}_{patient.patient_id_code}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_category = "pdf" if ext == "pdf" else ("image" if ext in ["png", "jpg", "jpeg"] else ("ecg_csv" if ext == "csv" else "json"))

    # Create upload record
    upload_record = MedicalUpload(
        patient_id=patient.id,
        uploader_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename,
        file_type=file_category,
        file_path=file_path,
        upload_purpose=upload_purpose,
        is_processed=False,
        notes=notes
    )
    db.add(upload_record)

    # Mark initial assessment as complete to unlock appointment booking
    patient.assessment_complete = True
    await db.flush()

    upload_id = upload_record.id

    # If structured data, dispatch ML prediction in background
    if ext in ["csv", "json"]:
        background_tasks.add_task(
            process_structured_file_prediction,
            upload_id,
            patient.id,
            file_path,
            ext
        )

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="UPLOAD_MEDICAL_REPORT",
        resource_type="medical_upload",
        resource_id=str(upload_id),
        details={"filename": file.filename, "file_type": file_category}
    ))

    await db.commit()

    return {
        "status": "success",
        "message": "Medical report submitted successfully. Your health assessment is now unlocked for appointment booking.",
        "upload_id": upload_id,
        "filename": unique_filename,
        "assessment_unlocked": True
    }

@router.get("/my")
async def list_patient_uploads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve list of medical documents uploaded by the current patient."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=403, detail="Patient profile not found.")

    stmt = (
        select(MedicalUpload)
        .options(selectinload(MedicalUpload.prediction))
        .where(MedicalUpload.patient_id == patient.id)
        .order_by(MedicalUpload.created_at.desc())
    )
    res = await db.execute(stmt)
    uploads = res.scalars().all()

    return [
        {
            "id": u.id,
            "original_filename": u.original_filename,
            "filename": u.filename,
            "file_type": u.file_type,
            "upload_purpose": u.upload_purpose,
            "is_processed": u.is_processed,
            "notes": u.notes,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "prediction": {
                "predicted_class": u.prediction.predicted_class,
                "condition_name": u.prediction.condition_name,
                "confidence_score": u.prediction.confidence_score,
                "probabilities": u.prediction.probabilities
            } if u.prediction else None
        }
        for u in uploads
    ]

@router.delete("/{upload_id}")
async def delete_medical_upload(
    upload_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an uploaded medical file."""
    stmt = select(MedicalUpload).where(MedicalUpload.id == upload_id)
    res = await db.execute(stmt)
    upload_rec = res.scalar_one_or_none()
    if not upload_rec:
        raise HTTPException(status_code=404, detail="Upload not found.")

    # Only patient who owns it or admin can delete
    if current_user.role != "admin" and upload_rec.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document.")

    if os.path.exists(upload_rec.file_path):
        try:
            os.remove(upload_rec.file_path)
        except Exception:
            pass

    await db.delete(upload_rec)
    await db.commit()
    return {"status": "success", "message": "Document deleted successfully."}


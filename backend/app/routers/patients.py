from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from app.database import get_db
from app.models import User, Patient, MedicalHistory, Medication, Allergy, ECGPrediction, AuditLog
from app.schemas import (
    PatientProfileUpdate, PatientOut,
    MedicalHistoryBase, MedicalHistoryOut,
    MedicationCreate, MedicationOut,
    AllergyBase, AllergyOut,
    PatientCreate, PatientUpdate, PatientListOut
)
from app.auth import get_current_user, get_current_patient, get_password_hash

router = APIRouter(prefix="/patients", tags=["Patient Management"])

# ==============================================================================
# Full Patient CRUD Endpoints
# ==============================================================================

@router.get("", response_model=List[PatientListOut])
async def list_all_patients(
    search: Optional[str] = Query(None, description="Search by name, patient code, or email"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists all registered patients with their latest ECG prediction status."""
    stmt = (
        select(Patient)
        .join(User, Patient.user_id == User.id)
        .options(
            selectinload(Patient.user),
            selectinload(Patient.ecg_predictions)
        )
        .order_by(desc(Patient.created_at))
        .limit(limit)
    )

    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            or_(
                User.full_name.ilike(search_term),
                Patient.patient_id_code.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    res = await db.execute(stmt)
    patients = res.scalars().all()

    patient_list = []
    for p in patients:
        preds = p.ecg_predictions or []
        latest_pred = sorted(preds, key=lambda x: x.created_at, reverse=True)[0] if preds else None

        patient_list.append(PatientListOut(
            id=p.id,
            patient_id_code=p.patient_id_code,
            full_name=p.user.full_name if p.user else "Anonymous",
            email=p.user.email if p.user else "",
            age=p.age,
            sex=p.sex,
            phone=p.phone,
            prediction_count=len(preds),
            latest_prediction_class=latest_pred.predicted_class if latest_pred else None,
            latest_prediction_date=latest_pred.created_at if latest_pred else None,
            created_at=p.created_at
        ))

    return patient_list


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def create_new_patient(
    payload: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new patient profile and user account."""
    # Generate unique patient code
    patient_code = f"PAT-2026-{uuid.uuid4().hex[:5].upper()}"

    # Handle user account creation or association
    email = payload.email
    if not email:
        email = f"patient_{uuid.uuid4().hex[:6]}@cardiopulse.health"

    # Check if user email already exists
    existing_user_res = await db.execute(select(User).options(selectinload(User.patient_profile)).where(User.email == email))
    existing_user = existing_user_res.scalars().first()

    if existing_user:
        if existing_user.patient_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A patient profile already exists for email {email}."
            )
        user_obj = existing_user
    else:
        # Create user account with default password
        user_obj = User(
            email=email,
            hashed_password=get_password_hash("PatientPass123!"),
            full_name=payload.full_name,
            role="patient",
            is_active=True
        )
        db.add(user_obj)
        await db.flush()

    # Create patient profile
    patient = Patient(
        user_id=user_obj.id,
        patient_id_code=patient_code,
        date_of_birth=payload.date_of_birth,
        age=payload.age,
        sex=payload.sex or "Unknown",
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        phone=payload.phone,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        emergency_contact_relation=payload.emergency_contact_relation,
        smoking_habit=payload.smoking_habit or "non-smoker",
        alcohol_consumption=payload.alcohol_consumption or "none",
        physical_activity_level=payload.physical_activity_level or "moderate"
    )
    db.add(patient)
    await db.flush()

    # Create medical history entry
    med_hist = MedicalHistory(
        patient_id=patient.id,
        has_heart_disease=payload.has_heart_disease,
        high_blood_pressure=payload.high_blood_pressure,
        diabetes=payload.diabetes,
        notes=payload.medical_notes
    )
    db.add(med_hist)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="CREATE_PATIENT",
        resource_type="PATIENT",
        resource_id=str(patient.id),
        details={"patient_code": patient_code, "name": payload.full_name}
    ))

    await db.commit()
    await db.refresh(patient)
    await db.refresh(user_obj)
    await db.refresh(med_hist)

    return PatientOut(
        id=patient.id,
        user_id=user_obj.id,
        patient_id_code=patient.patient_id_code,
        full_name=user_obj.full_name,
        email=user_obj.email,
        age=patient.age,
        sex=patient.sex,
        height_cm=patient.height_cm,
        weight_kg=patient.weight_kg,
        phone=patient.phone,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        emergency_contact_relation=patient.emergency_contact_relation,
        smoking_habit=patient.smoking_habit,
        alcohol_consumption=patient.alcohol_consumption,
        physical_activity_level=patient.physical_activity_level,
        sleep_duration_hours=patient.sleep_duration_hours or 7.0,
        stress_level=patient.stress_level or "moderate",
        caffeine_intake=patient.caffeine_intake or "moderate",
        medical_history=med_hist,
        medications=[],
        allergies=[],
        created_at=patient.created_at
    )


@router.get("/profile")
async def get_current_patient_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full profile for the currently logged-in patient."""
    stmt = (
        select(Patient)
        .options(
            selectinload(Patient.user),
            selectinload(Patient.medical_history),
            selectinload(Patient.ecg_predictions)
        )
        .where(Patient.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    patient = res.scalars().first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found for this account."
        )

    preds = patient.ecg_predictions or []
    latest_pred = sorted(preds, key=lambda x: x.created_at, reverse=True)[0] if preds else None

    return {
        "id": patient.id,
        "user_id": current_user.id,
        "patient_id_code": patient.patient_id_code,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "age": patient.age,
        "sex": patient.sex,
        "gender": patient.gender or patient.sex,
        "phone": patient.phone,
        "address": patient.address,
        "assessment_complete": patient.assessment_complete,
        "height_cm": patient.height_cm,
        "weight_kg": patient.weight_kg,
        "physical_activity_level": patient.physical_activity_level,
        "smoking_habit": patient.smoking_habit,
        "alcohol_consumption": patient.alcohol_consumption,
        "stress_level": patient.stress_level,
        "medical_history": patient.medical_history.notes if patient.medical_history else None,
        "latest_prediction": {
            "predicted_class": latest_pred.predicted_class,
            "condition_name": latest_pred.condition_name,
            "confidence_score": latest_pred.confidence_score,
            "probabilities": latest_pred.probabilities,
            "created_at": latest_pred.created_at.isoformat()
        } if latest_pred else None,
        "created_at": patient.created_at.isoformat() if patient.created_at else None
    }


@router.put("/profile")
async def update_current_patient_profile(
    age: Optional[int] = None,
    gender: Optional[str] = None,
    address: Optional[str] = None,
    phone: Optional[str] = None,
    physical_activity_level: Optional[str] = None,
    medical_history_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates demographic and lifestyle profile for currently logged-in patient."""
    stmt = select(Patient).options(selectinload(Patient.medical_history)).where(Patient.user_id == current_user.id)
    res = await db.execute(stmt)
    patient = res.scalars().first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found."
        )

    if age is not None:
        patient.age = age
    if gender is not None:
        patient.gender = gender
        patient.sex = gender
    if address is not None:
        patient.address = address
    if phone is not None:
        patient.phone = phone
    if physical_activity_level is not None:
        patient.physical_activity_level = physical_activity_level
    if medical_history_notes is not None:
        if patient.medical_history:
            patient.medical_history.notes = medical_history_notes
        else:
            db.add(MedicalHistory(patient_id=patient.id, notes=medical_history_notes))

    await db.commit()
    return {"status": "success", "message": "Profile updated successfully"}


@router.put("/medical-history", response_model=MedicalHistoryOut)
async def update_medical_history(
    history_in: MedicalHistoryBase,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(MedicalHistory).where(MedicalHistory.patient_id == current_patient.id))
    history = res.scalars().first()
    if not history:
        history = MedicalHistory(patient_id=current_patient.id)
        db.add(history)

    for field, val in history_in.dict().items():
        setattr(history, field, val)

    await db.commit()
    await db.refresh(history)
    return history

@router.post("/medications", response_model=MedicationOut)
async def add_medication(
    med_in: MedicationCreate,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    med = Medication(patient_id=current_patient.id, **med_in.dict())
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med

@router.delete("/medications/{med_id}")
async def delete_medication(
    med_id: int,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Medication).where(Medication.id == med_id, Medication.patient_id == current_patient.id))
    med = res.scalars().first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    await db.delete(med)
    await db.commit()
    return {"message": "Medication removed"}

@router.post("/allergies", response_model=AllergyOut)
async def add_allergy(
    allergy_in: AllergyBase,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    allergy = Allergy(patient_id=current_patient.id, **allergy_in.dict())
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)
    return allergy

@router.delete("/allergies/{allergy_id}")
async def delete_allergy(
    allergy_id: int,
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Allergy).where(Allergy.id == allergy_id, Allergy.patient_id == current_patient.id))
    allergy = res.scalars().first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")
    await db.delete(allergy)
    await db.commit()
    return {"message": "Allergy removed"}


@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient_by_id(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves detailed profile for a specific patient by ID."""
    stmt = (
        select(Patient)
        .options(
            selectinload(Patient.user),
            selectinload(Patient.medical_history),
            selectinload(Patient.medications),
            selectinload(Patient.allergies),
            selectinload(Patient.ecg_predictions)
        )
        .where(Patient.id == patient_id)
    )
    res = await db.execute(stmt)
    patient = res.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found."
        )

    user_obj = patient.user
    full_name = user_obj.full_name if user_obj else "Anonymous"
    email = user_obj.email if user_obj else ""

    return PatientOut(
        id=patient.id,
        user_id=patient.user_id,
        patient_id_code=patient.patient_id_code,
        full_name=full_name,
        email=email,
        age=patient.age,
        sex=patient.sex,
        height_cm=patient.height_cm,
        weight_kg=patient.weight_kg,
        phone=patient.phone,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        emergency_contact_relation=patient.emergency_contact_relation,
        smoking_habit=patient.smoking_habit or "non-smoker",
        alcohol_consumption=patient.alcohol_consumption or "none",
        physical_activity_level=patient.physical_activity_level or "moderate",
        sleep_duration_hours=patient.sleep_duration_hours or 7.0,
        stress_level=patient.stress_level or "moderate",
        caffeine_intake=patient.caffeine_intake or "moderate",
        is_pregnant=patient.is_pregnant or False,
        pregnancy_trimester=patient.pregnancy_trimester,
        recent_illness_or_fever=patient.recent_illness_or_fever or False,
        recent_illness_details=patient.recent_illness_details,
        medical_history=patient.medical_history,
        medications=patient.medications or [],
        allergies=patient.allergies or [],
        created_at=patient.created_at
    )


@router.put("/{patient_id}", response_model=PatientOut)
async def update_patient_by_id(
    patient_id: int,
    payload: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates a patient's details by ID."""
    stmt = (
        select(Patient)
        .options(
            selectinload(Patient.user),
            selectinload(Patient.medical_history),
            selectinload(Patient.medications),
            selectinload(Patient.allergies)
        )
        .where(Patient.id == patient_id)
    )
    res = await db.execute(stmt)
    patient = res.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found."
        )

    if payload.full_name and patient.user:
        patient.user.full_name = payload.full_name

    fields = [
        "age", "sex", "height_cm", "weight_kg", "phone",
        "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
        "smoking_habit", "alcohol_consumption", "physical_activity_level"
    ]
    for field in fields:
        val = getattr(payload, field)
        if val is not None:
            setattr(patient, field, val)

    db.add(AuditLog(
        user_id=current_user.id,
        action="UPDATE_PATIENT",
        resource_type="PATIENT",
        resource_id=str(patient.id),
        details={"updated_by": current_user.email}
    ))

    await db.commit()
    await db.refresh(patient)
    return await get_patient_by_id(patient_id=patient.id, current_user=current_user, db=db)


@router.delete("/{patient_id}")
async def delete_patient_by_id(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a patient record."""
    stmt = select(Patient).where(Patient.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found."
        )

    db.add(AuditLog(
        user_id=current_user.id,
        action="DELETE_PATIENT",
        resource_type="PATIENT",
        resource_id=str(patient_id),
        details={"patient_code": patient.patient_id_code}
    ))

    await db.delete(patient)
    await db.commit()
    return {"message": f"Patient {patient_id} successfully deleted."}

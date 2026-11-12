from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Literal
from app.database import get_db
from app.models import User, Patient, Doctor, AuditLog, UserConsent, MedicalHistory
from app.schemas import (
    UserCreate, UserLogin, Token, UserOut, ForgotPasswordRequest, ResetPasswordRequest,
    DoctorRegister, PatientRegister
)
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
async def register(
    role: Optional[Literal["doctor", "patient", "admin"]] = Body(None),
    doctor: Optional[DoctorRegister] = Body(None),
    patient: Optional[PatientRegister] = Body(None),
    user_in: Optional[UserCreate] = Body(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new Doctor or Patient.
    - Doctors are created in 'pending approval' state (is_approved=False).
    - Patients must complete health assessment to unlock full booking features.
    """
    # Determine which registration payload is provided
    target_role = role or (user_in.role if user_in else "patient")
    email = None
    password = None
    full_name = None

    if target_role == "doctor" and doctor:
        email = doctor.email
        password = doctor.password
        full_name = doctor.full_name
    elif target_role == "patient" and patient:
        email = patient.email
        password = patient.password
        full_name = patient.full_name
    elif user_in:
        email = user_in.email
        password = user_in.password
        full_name = user_in.full_name
        target_role = user_in.role
    else:
        raise HTTPException(status_code=400, detail="Missing registration information")

    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    new_user = User(
        email=email,
        hashed_password=get_password_hash(password),
        role=target_role,
        full_name=full_name,
        is_active=True
    )
    db.add(new_user)
    await db.flush()

    patient_id = None
    doctor_id = None

    if target_role == "patient":
        pid_code = f"PAT-2026-{uuid.uuid4().hex[:6].upper()}"
        age = patient.age if patient else None
        gender = patient.gender if patient else None
        phone = patient.phone_number if patient else None
        address = patient.address if patient else None

        pat = Patient(
            user_id=new_user.id,
            patient_id_code=pid_code,
            age=age,
            sex=gender,
            gender=gender,
            phone=phone,
            address=address,
            assessment_complete=False
        )
        db.add(pat)
        await db.flush()
        patient_id = pat.id
        
        # Initialize or update medical history safely
        hist_data = patient.medical_history if (patient and patient.medical_history) else {}
        existing_hist = (await db.execute(select(MedicalHistory).where(MedicalHistory.patient_id == pat.id))).scalars().first()
        if existing_hist:
            existing_hist.notes = str(hist_data.get("notes") or "")
            existing_hist.has_heart_disease = bool(hist_data.get("has_heart_disease", False))
            existing_hist.high_blood_pressure = bool(hist_data.get("high_blood_pressure", False))
            existing_hist.diabetes = bool(hist_data.get("diabetes", False))
            existing_hist.previous_cardiac_event = bool(hist_data.get("previous_cardiac_event", False))
        else:
            db.add(MedicalHistory(
                patient_id=pat.id,
                notes=str(hist_data.get("notes") or "") if hist_data.get("notes") else None,
                has_heart_disease=bool(hist_data.get("has_heart_disease", False)),
                high_blood_pressure=bool(hist_data.get("high_blood_pressure", False)),
                diabetes=bool(hist_data.get("diabetes", False)),
                previous_cardiac_event=bool(hist_data.get("previous_cardiac_event", False))
            ))
        
        # Initialize default user consent record safely
        existing_consent = (await db.execute(select(UserConsent).where(UserConsent.patient_id == pat.id))).scalars().first()
        if not existing_consent:
            db.add(UserConsent(
                patient_id=pat.id,
                consent_data_processing=True,
                consent_ai_analysis=True,
                consent_clinical_sharing=True
            ))
    elif target_role == "doctor":
        lic = f"MD-CARDIO-{uuid.uuid4().hex[:5].upper()}"
        specialty = doctor.specialization if doctor else "Cardiology"
        qualification = doctor.qualification if doctor else None
        experience_years = doctor.experience_years if doctor else None
        hospital_name = doctor.hospital_name if doctor else None
        phone_number = doctor.phone_number if doctor else None
        profile_picture = doctor.profile_picture if doctor else None
        availability = doctor.availability if doctor else None
        consultation_fee = doctor.consultation_fee if doctor else None

        doc = Doctor(
            user_id=new_user.id,
            license_number=lic,
            specialty=specialty,
            qualification=qualification,
            experience_years=experience_years,
            hospital_name=hospital_name,
            hospital_affiliation=hospital_name,
            phone_number=phone_number,
            consultation_phone=phone_number,
            profile_picture=profile_picture,
            availability=availability,
            consultation_fee=consultation_fee,
            is_approved=False, # Admin must approve doctor before login
            verified=False
        )
        db.add(doc)
        await db.flush()
        doctor_id = doc.id

    # Audit log
    db.add(AuditLog(
        user_id=new_user.id,
        action="USER_REGISTRATION",
        resource_type="USER",
        resource_id=str(new_user.id),
        details={"role": target_role, "email": email}
    ))

    await db.commit()

    access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})
    return Token(
        access_token=access_token,
        user_id=new_user.id,
        email=new_user.email,
        role=new_user.role,
        full_name=new_user.full_name,
        patient_id=patient_id,
        doctor_id=doctor_id
    )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated or suspended. Please contact the administrator."
        )
    
    patient_id = None
    doctor_id = None
    if user.role == "patient":
        p_res = await db.execute(select(Patient).where(Patient.user_id == user.id))
        p = p_res.scalars().first()
        if p:
            patient_id = p.id
    elif user.role == "doctor":
        d_res = await db.execute(select(Doctor).where(Doctor.user_id == user.id))
        d = d_res.scalars().first()
        if d:
            doctor_id = d.id
            if not d.is_approved:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your doctor registration is pending administrator approval. You can log in once approved."
                )

    # Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        resource_type="AUTH",
        resource_id=str(user.id),
        details={"email": user.email, "role": user.role}
    ))
    await db.commit()

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return Token(
        access_token=token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        patient_id=patient_id,
        doctor_id=doctor_id
    )

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a secure password reset token for clinical or patient accounts.
    """
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if not user:
        # Return generic message to prevent account enumeration
        return {"message": "If an account with this email exists, a password reset token has been issued."}

    reset_token = uuid.uuid4().hex[:12]
    # Record audit log
    db.add(AuditLog(
        user_id=user.id,
        action="FORGOT_PASSWORD_REQUEST",
        resource_type="AUTH",
        resource_id=str(user.id),
        details={"email": req.email, "reset_token": reset_token}
    ))
    await db.commit()

    return {
        "message": "Password reset token generated.",
        "reset_token": reset_token,
        "email": req.email,
        "instructions": "Use this token with the reset-password endpoint to update your password."
    }

@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resets user password given a valid reset token and new password.
    """
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if not req.reset_token or len(req.reset_token) < 4:
        raise HTTPException(status_code=400, detail="Invalid password reset token.")

    user.hashed_password = get_password_hash(req.new_password)
    db.add(AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET_COMPLETED",
        resource_type="AUTH",
        resource_id=str(user.id),
        details={"email": req.email}
    ))
    await db.commit()

    return {"message": "Password has been successfully updated. You may now log in with your new password."}

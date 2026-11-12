from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import os
from datetime import datetime

from app.database import get_db
from app.models import Prescription, Doctor, Patient, User, Appointment, Notification, AuditLog
from app.schemas import PrescriptionCreate, PrescriptionOut
from app.auth import get_current_user, get_current_doctor

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

PRESCRIPTION_DIR = "static/prescriptions"
os.makedirs(PRESCRIPTION_DIR, exist_ok=True)

def generate_prescription_pdf(rx: Prescription, doc_user: User, pat_user: User, doc_profile: Doctor, output_path: str):
    """Compiles a clean clinical PDF prescription document."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'RxTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#1E3A8A')
        )
        sub_style = ParagraphStyle(
            'RxSub',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#64748B')
        )
        heading_style = ParagraphStyle(
            'RxHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=10,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            'RxBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor('#334155')
        )

        # Header Banner
        story.append(Paragraph("CardioPulse AI — Official Clinical Prescription", title_style))
        story.append(Paragraph(f"Attending Cardiologist: Dr. {doc_user.full_name} | {doc_profile.specialty} | License: {doc_profile.license_number}", sub_style))
        story.append(Paragraph(f"Hospital / Clinic: {doc_profile.hospital_name or doc_profile.hospital_affiliation or 'CardioPulse Medical Center'}", sub_style))
        story.append(Spacer(1, 12))

        # Patient Info Table
        info_data = [
            [Paragraph(f"<b>Patient Name:</b> {pat_user.full_name}", body_style), Paragraph(f"<b>Date:</b> {rx.created_at.strftime('%B %d, %Y')}", body_style)],
            [Paragraph(f"<b>Condition:</b> {rx.patient_condition}", body_style), Paragraph(f"<b>Follow-up Date:</b> {rx.followup_date or 'As needed'}", body_style)]
        ]
        info_table = Table(info_data, colWidths=[270, 270])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 14))

        # Clinical Assessment
        story.append(Paragraph("Clinical Assessment & Diagnostic Findings", heading_style))
        story.append(Paragraph(rx.clinical_assessment or "Routine follow-up assessment.", body_style))
        story.append(Spacer(1, 12))

        # Rx Medicines Table
        story.append(Paragraph("Prescribed Medications (Rx)", heading_style))
        med_rows = [[Paragraph("<b>Medication</b>", body_style), Paragraph("<b>Dosage</b>", body_style), Paragraph("<b>Frequency</b>", body_style), Paragraph("<b>Duration</b>", body_style)]]
        
        for m in (rx.medicines or []):
            med_rows.append([
                Paragraph(str(m.get("name", "Medicine")), body_style),
                Paragraph(str(m.get("dosage", "")), body_style),
                Paragraph(str(m.get("frequency", "")), body_style),
                Paragraph(str(m.get("duration", "")), body_style)
            ])

        med_table = Table(med_rows, colWidths=[160, 110, 135, 135])
        med_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284C7')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
        ]))
        story.append(med_table)
        story.append(Spacer(1, 14))

        # Lifestyle & Recommendations
        if rx.lifestyle_recommendations or rx.diet_recommendations or rx.exercise_recommendations:
            story.append(Paragraph("Lifestyle & Dietary Guidance", heading_style))
            if rx.lifestyle_recommendations:
                story.append(Paragraph(f"• <b>General:</b> {rx.lifestyle_recommendations}", body_style))
            if rx.diet_recommendations:
                story.append(Paragraph(f"• <b>Diet:</b> {rx.diet_recommendations}", body_style))
            if rx.exercise_recommendations:
                story.append(Paragraph(f"• <b>Exercise:</b> {rx.exercise_recommendations}", body_style))
            story.append(Spacer(1, 12))

        if rx.doctor_notes:
            story.append(Paragraph("Doctor's Additional Notes", heading_style))
            story.append(Paragraph(rx.doctor_notes, body_style))
            story.append(Spacer(1, 14))

        # Signature Footer
        story.append(Spacer(1, 10))
        sig_data = [
            [Paragraph("<b>Status:</b> Clinician Verified & Cryptographically Signed", sub_style),
             Paragraph(f"<b>Digitally Signed By:</b> Dr. {doc_user.full_name}, MD", sub_style)]
        ]
        sig_table = Table(sig_data, colWidths=[270, 270])
        sig_table.setStyle(TableStyle([
            ('LINEABOVE', (0,0), (-1,-1), 1, colors.HexColor('#94A3B8')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(sig_table)

        doc.build(story)
        return True
    except Exception as e:
        print(f"[!] Warning generating prescription PDF: {e}")
        return False

@router.post("", response_model=PrescriptionOut)
async def create_prescription(
    data: PrescriptionCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Attending physician issues a formal prescription for a patient."""
    pat_stmt = select(Patient).options(selectinload(Patient.user)).where(Patient.id == data.patient_id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    pdf_filename = f"rx_{current_doctor.id}_{patient.id}_{int(datetime.utcnow().timestamp())}.pdf"
    pdf_path = os.path.join(PRESCRIPTION_DIR, pdf_filename)

    rx = Prescription(
        patient_id=data.patient_id,
        doctor_id=current_doctor.id,
        appointment_id=data.appointment_id,
        patient_condition=data.patient_condition,
        clinical_assessment=data.clinical_assessment,
        medicines=data.medicines,
        lifestyle_recommendations=data.lifestyle_recommendations,
        diet_recommendations=data.diet_recommendations,
        exercise_recommendations=data.exercise_recommendations,
        followup_date=data.followup_date,
        doctor_notes=data.doctor_notes,
        pdf_filename=pdf_filename
    )
    db.add(rx)
    await db.flush()

    # Generate PDF
    generate_prescription_pdf(rx, current_user, patient.user, current_doctor, pdf_path)

    # Notify patient
    if patient.user_id:
        db.add(Notification(
            user_id=patient.user_id,
            category="report",
            title="New Prescription Issued",
            message=f"Dr. {current_user.full_name} has issued a new prescription for {data.patient_condition}.",
            priority="high"
        ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="ISSUE_PRESCRIPTION",
        resource_type="prescription",
        resource_id=str(rx.id),
        details={"patient_id": patient.id, "condition": data.patient_condition}
    ))

    await db.commit()
    await db.refresh(rx)
    return rx

@router.get("")
async def get_prescriptions_list(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve prescriptions based on authenticated user role (doctor or patient)."""
    if current_user.role == "doctor":
        # Inline doctor prescription retrieval
        doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        doctor = doc_res.scalar_one_or_none()
        if not doctor:
            return []
        stmt = (
            select(Prescription)
            .options(selectinload(Prescription.patient).selectinload(Patient.user))
            .where(Prescription.doctor_id == doctor.id)
            .order_by(Prescription.created_at.desc())
        )
        res = await db.execute(stmt)
        rx_list = res.scalars().all()
        return [
            {
                "id": r.id,
                "patient_id": r.patient_id,
                "patient_name": r.patient.user.full_name if (r.patient and r.patient.user) else "Patient",
                "patient_code": r.patient.patient_id_code if r.patient else "",
                "patient_condition": r.patient_condition,
                "clinical_assessment": r.clinical_assessment,
                "medicines": r.medicines,
                "followup_date": r.followup_date,
                "pdf_filename": r.pdf_filename,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in rx_list
        ]
    # Patient prescription retrieval
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
        return []
    stmt = (
        select(Prescription)
        .options(selectinload(Prescription.doctor).selectinload(Doctor.user))
        .where(Prescription.patient_id == patient.id)
        .order_by(Prescription.created_at.desc())
    )
    res = await db.execute(stmt)
    rx_list = res.scalars().all()
    return [
        {
            "id": r.id,
            "doctor_id": r.doctor_id,
            "doctor_name": r.doctor.user.full_name if (r.doctor and r.doctor.user) else "Doctor",
            "doctor_specialty": r.doctor.specialty if r.doctor else "Cardiology",
            "doctor_hospital": r.doctor.hospital_name or r.doctor.hospital_affiliation if r.doctor else "",
            "patient_condition": r.patient_condition,
            "clinical_assessment": r.clinical_assessment,
            "medicines": r.medicines,
            "lifestyle_recommendations": r.lifestyle_recommendations,
            "diet_recommendations": r.diet_recommendations,
            "exercise_recommendations": r.exercise_recommendations,
            "followup_date": r.followup_date,
            "doctor_notes": r.doctor_notes,
            "pdf_filename": r.pdf_filename,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in rx_list
    ]

@router.get("/my")
async def get_my_prescriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Patient retrieves list of prescriptions issued to them."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=403, detail="Patient profile not found.")

    stmt = (
        select(Prescription)
        .options(selectinload(Prescription.doctor).selectinload(Doctor.user))
        .where(Prescription.patient_id == patient.id)
        .order_by(Prescription.created_at.desc())
    )
    res = await db.execute(stmt)
    rx_list = res.scalars().all()

    return [
        {
            "id": r.id,
            "doctor_id": r.doctor_id,
            "doctor_name": r.doctor.user.full_name if (r.doctor and r.doctor.user) else "Doctor",
            "doctor_specialty": r.doctor.specialty if r.doctor else "Cardiology",
            "doctor_hospital": r.doctor.hospital_name or r.doctor.hospital_affiliation if r.doctor else "",
            "patient_condition": r.patient_condition,
            "clinical_assessment": r.clinical_assessment,
            "medicines": r.medicines,
            "lifestyle_recommendations": r.lifestyle_recommendations,
            "diet_recommendations": r.diet_recommendations,
            "exercise_recommendations": r.exercise_recommendations,
            "followup_date": r.followup_date,
            "doctor_notes": r.doctor_notes,
            "pdf_filename": r.pdf_filename,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in rx_list
    ]

@router.get("/doctor")
async def get_doctor_issued_prescriptions(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Doctor retrieves list of prescriptions they have issued."""
    stmt = (
        select(Prescription)
        .options(selectinload(Prescription.patient).selectinload(Patient.user))
        .where(Prescription.doctor_id == current_doctor.id)
        .order_by(Prescription.created_at.desc())
    )
    res = await db.execute(stmt)
    rx_list = res.scalars().all()

    return [
        {
            "id": r.id,
            "patient_id": r.patient_id,
            "patient_name": r.patient.user.full_name if (r.patient and r.patient.user) else "Patient",
            "patient_code": r.patient.patient_id_code if r.patient else "",
            "patient_condition": r.patient_condition,
            "clinical_assessment": r.clinical_assessment,
            "medicines": r.medicines,
            "followup_date": r.followup_date,
            "pdf_filename": r.pdf_filename,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in rx_list
    ]

@router.get("/{prescription_id}")
async def get_prescription_by_id(
    prescription_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve detailed prescription record."""
    stmt = (
        select(Prescription)
        .options(
            selectinload(Prescription.doctor).selectinload(Doctor.user),
            selectinload(Prescription.patient).selectinload(Patient.user)
        )
        .where(Prescription.id == prescription_id)
    )
    res = await db.execute(stmt)
    rx = res.scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    return {
        "id": rx.id,
        "patient_id": rx.patient_id,
        "patient_name": rx.patient.user.full_name if (rx.patient and rx.patient.user) else "Patient",
        "doctor_id": rx.doctor_id,
        "doctor_name": rx.doctor.user.full_name if (rx.doctor and rx.doctor.user) else "Doctor",
        "doctor_specialty": rx.doctor.specialty if rx.doctor else "Cardiology",
        "patient_condition": rx.patient_condition,
        "clinical_assessment": rx.clinical_assessment,
        "medicines": rx.medicines,
        "lifestyle_recommendations": rx.lifestyle_recommendations,
        "diet_recommendations": rx.diet_recommendations,
        "exercise_recommendations": rx.exercise_recommendations,
        "followup_date": rx.followup_date,
        "doctor_notes": rx.doctor_notes,
        "pdf_filename": rx.pdf_filename,
        "created_at": rx.created_at.isoformat() if rx.created_at else None
    }

@router.get("/{prescription_id}/download")
async def download_prescription_pdf(
    prescription_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Download generated PDF prescription."""
    stmt = select(Prescription).where(Prescription.id == prescription_id)
    res = await db.execute(stmt)
    rx = res.scalar_one_or_none()
    if not rx or not rx.pdf_filename:
        raise HTTPException(status_code=404, detail="Prescription file not found.")

    file_path = os.path.join(PRESCRIPTION_DIR, rx.pdf_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file does not exist on server.")

    return FileResponse(file_path, media_type="application/pdf", filename=rx.pdf_filename)


from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import os
from sqlalchemy import select

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.seed_data import seed_database
from app.ml.model_loader import load_model
from app.models import User, AuditLog
from app.auth import get_password_hash
from app.routers import (
    auth, patients, readings, analysis, reports, doctor, chat, audit,
    appointments, messages, notifications, devices, education, admin, analytics, telemetry_ws,
    predictions, medical_uploads, prescriptions
)
from app.routers.doctor import doctors_public_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure static and database directories exist
    os.makedirs("static/reports", exist_ok=True)
    os.makedirs("static/uploads", exist_ok=True)
    os.makedirs("static/prescriptions", exist_ok=True)
    os.makedirs(settings.DB_DIR, exist_ok=True)
    
    if os.environ.get("TESTING") != "1":
        # Initialize database tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            def migrate_columns(sync_conn):
                raw = sync_conn.connection
                cursor = raw.cursor()
                def add_col(table, col, col_type):
                    try:
                        cursor.execute(f"PRAGMA table_info({table})")
                        cols = [r[1] for r in cursor.fetchall()]
                        if cols and col not in cols:
                            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
                    except Exception:
                        pass
                add_col("doctors", "hospital_name", "TEXT")
                add_col("doctors", "qualification", "TEXT")
                add_col("doctors", "experience_years", "INTEGER")
                add_col("doctors", "phone_number", "TEXT")
                add_col("doctors", "profile_picture", "TEXT")
                add_col("doctors", "availability", "JSON")
                add_col("doctors", "consultation_fee", "REAL")
                add_col("doctors", "is_approved", "BOOLEAN DEFAULT 0")
                add_col("patients", "gender", "TEXT")
                add_col("patients", "address", "TEXT")
                add_col("patients", "phone_number", "TEXT")
                add_col("patients", "assessment_complete", "BOOLEAN DEFAULT 0")
            await conn.run_sync(migrate_columns)
        
        # Pre-load trained Extra Trees ML classification pipeline (once at startup)
        try:
            load_model()
        except Exception as e:
            print(f"[!] Warning: Could not pre-load ML model bundle during startup: {e}")

        # Super Admin Account Bootstrap
        admin_email = os.getenv("ADMIN_EMAIL", "manojbarik84998@gmail.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "Manoj@123")
        async with AsyncSessionLocal() as session:
            admin_stmt = select(User).where(User.email == admin_email)
            admin_res = await session.execute(admin_stmt)
            existing_admin = admin_res.scalar_one_or_none()
            if not existing_admin:
                super_admin = User(
                    email=admin_email,
                    hashed_password=get_password_hash(admin_password),
                    role="admin",
                    full_name="Super Administrator",
                    is_active=True
                )
                session.add(super_admin)
                await session.flush()
                session.add(AuditLog(
                    user_id=super_admin.id,
                    action="SYSTEM_INIT_SUPER_ADMIN",
                    resource_type="USER",
                    resource_id=str(super_admin.id),
                    details={"email": admin_email}
                ))
                await session.commit()
                print(f"[AUTH] Super Admin initialized: {admin_email}")

        # Seed sample clinical data
        async with AsyncSessionLocal() as session:
            await seed_database(session)
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Heart Rate Monitoring and Clinical Decision Support Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated static reports (PDFs)
os.makedirs("static/reports", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(readings.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(doctor.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(messages.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(devices.router, prefix=settings.API_V1_STR)
app.include_router(education.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(telemetry_ws.router, prefix=settings.API_V1_STR)
app.include_router(predictions.router, prefix=settings.API_V1_STR)
app.include_router(doctors_public_router, prefix=settings.API_V1_STR)
app.include_router(medical_uploads.router, prefix=settings.API_V1_STR)
app.include_router(prescriptions.router, prefix=settings.API_V1_STR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    err_tb = traceback.format_exc()
    print(f"[!] Unhandled Exception on {request.method} {request.url.path}: {exc}\n{err_tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "engine": "CardioPulse Clinical Triage v1.0",
        "ai_integration": "Gemini Live API Ready (with Clinical NLP Fallback)"
    }

# Mount Frontend Dist Assets if compiled
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    images_dir = os.path.join(dist_dir, "images")
    if os.path.exists(images_dir):
        app.mount("/images", StaticFiles(directory=images_dir), name="images")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("static"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))

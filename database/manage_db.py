"""
CardioPulse AI - Database Management Utility
Usage:
    python database/manage_db.py init       # Initialize tables and seed demo clinical data
    python database/manage_db.py inspect    # Display summary of all tables and record counts
    python database/manage_db.py backup     # Create a timestamped backup of cardiopulse.db
    python database/manage_db.py reset      # Wipe and re-create clean database with seed data
"""

import sys
import os
import shutil
import asyncio
from pathlib import Path
from datetime import datetime, timezone

# Ensure backend directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.seed_data import seed_database
from app.models import (
    User, Patient, Doctor, HeartRateReading, Symptom,
    AIAnalysis, HealthReport, EmergencyAlert, AuditLog, Device
)
from sqlalchemy import select, func


async def init_db():
    """Create all tables and seed clinical demo data."""
    print(f"[+] Initializing database at: {settings.DATABASE_URL}")
    os.makedirs(settings.DB_DIR, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[+] Database schema successfully created.")

    async with AsyncSessionLocal() as session:
        await seed_database(session)
    print("[+] Clinical demo records successfully verified/seeded.")


async def inspect_db():
    """Print record counts and registered accounts."""
    db_file = Path(settings.DB_DIR) / "cardiopulse.db"
    print(f"\n========================================================")
    print(f" CardioPulse Database Inspector")
    print(f" Database Location: {db_file}")
    print(f" File Exists: {db_file.exists()}")
    if db_file.exists():
        print(f" File Size: {db_file.stat().st_size / 1024:.2f} KB")
    print(f"========================================================\n")

    if not db_file.exists() and "sqlite" in settings.DATABASE_URL:
        print("[!] Database file not found. Run 'init' to create it.")
        return

    async with AsyncSessionLocal() as session:
        counts = {
            "Users": await session.scalar(select(func.count(User.id))),
            "Patients": await session.scalar(select(func.count(Patient.id))),
            "Doctors": await session.scalar(select(func.count(Doctor.id))),
            "HR Readings": await session.scalar(select(func.count(HeartRateReading.id))),
            "AI Analyses": await session.scalar(select(func.count(AIAnalysis.id))),
            "Clinical Reports": await session.scalar(select(func.count(HealthReport.id))),
            "Emergency Alerts": await session.scalar(select(func.count(EmergencyAlert.id))),
            "Connected Devices": await session.scalar(select(func.count(Device.id))),
            "Audit Logs": await session.scalar(select(func.count(AuditLog.id))),
        }

        print("--- Table Record Counts ---")
        for table, count in counts.items():
            print(f"  * {table:20s}: {count or 0}")

        print("\n--- Pre-Configured Users ---")
        result = await session.execute(select(User.email, User.role, User.full_name))
        for email, role, name in result.all():
            print(f"  [{role.upper():7s}] {name:32s} <{email}>")
    print("\n========================================================\n")


def backup_db():
    """Create a timestamped backup copy of cardiopulse.db."""
    db_file = Path(settings.DB_DIR) / "cardiopulse.db"
    if not db_file.exists():
        print(f"[!] No database file found at {db_file} to backup.")
        return

    backups_dir = Path(settings.DB_DIR) / "backups"
    backups_dir.mkdir(exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_file = backups_dir / f"cardiopulse_backup_{ts}.db"
    shutil.copy2(db_file, backup_file)
    print(f"[+] Backup successfully created at: {backup_file}")


async def reset_db():
    """Drop all tables and recreate clean database."""
    confirm = input("Are you sure you want to RESET the database? All data will be replaced. (y/N): ")
    if confirm.strip().lower() != "y":
        print("[-] Operation aborted.")
        return

    backup_db()
    print("[+] Dropping existing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database(session)
    print("[+] Clean database reset and seeded successfully.")


def main():
    command = sys.argv[1].lower() if len(sys.argv) > 1 else "inspect"
    if command == "init":
        asyncio.run(init_db())
    elif command == "inspect":
        asyncio.run(inspect_db())
    elif command == "backup":
        backup_db()
    elif command == "reset":
        asyncio.run(reset_db())
    else:
        print(f"Unknown command: '{command}'")
        print("Available commands: init, inspect, backup, reset")


if __name__ == "__main__":
    main()


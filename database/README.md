# CardioPulse AI - Dedicated SQLite Database Directory

This folder is the dedicated repository location for the application's local **SQLite** database.

## Database File
- **Database File:** `cardiopulse.db`
- **Driver:** `aiosqlite` (Asynchronous SQLite driver with WAL journal support)
- **Engine:** SQLAlchemy 2.0 (`create_async_engine`)

## How it Works
1. When the backend server launches (via `uvicorn`, `run.bat`, or Docker), `app.config.settings` resolves the path directly to this folder:
   ```
   database/cardiopulse.db
   ```
2. The database schema (21 tables defined in `backend/app/models.py`) is automatically initialized on the first startup.
3. Clinical demo data and accounts (Admin, Cardiologist Dr. Sarah Chen, and clinical patient profiles) are automatically seeded by `backend/app/seed_data.py`.

## Database Management Utility

A management CLI is included at `database/manage_db.py`:

```bash
# 1. Initialize tables and seed demo data without starting uvicorn:
python database/manage_db.py init

# 2. Inspect record counts, table stats, and registered users:
python database/manage_db.py inspect

# 3. Create a timestamped backup into database/backups/:
python database/manage_db.py backup

# 4. Wipe and cleanly re-seed database:
python database/manage_db.py reset
```

## Inspecting the SQLite Database
You can inspect and query `cardiopulse.db` using:
- **VS Code Extension:** *SQLite Viewer* or *Database Client*
- **Desktop GUI:** [DB Browser for SQLite](https://sqlitebrowser.org/)
- **Command Line:** `sqlite3 cardiopulse.db`

i want to separet that databsae folder in my project and o want to use the sql lite database i want to use there 
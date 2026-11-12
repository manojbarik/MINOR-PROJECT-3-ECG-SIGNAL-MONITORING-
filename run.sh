#!/usr/bin/env bash
# ======================================================================
# CardioPulse AI - macOS / Linux Launch Script
# ======================================================================

set -e

echo "======================================================================"
echo "Starting CardioPulse AI - Clinical Heart Rate Monitoring Platform..."
echo "======================================================================"
echo ""
echo "Accessible URL: http://127.0.0.1:8000"
echo "Doctor Login:   doctor@cardiopulse.health / DoctorPass123!"
echo "Patient Login:  patient@cardiopulse.health / PatientPass123!"
echo ""

export PYTHONPATH="backend"

# Detect python binary (venv or system)
if [ -f ".venv/bin/python" ]; then
    PYTHON_CMD=".venv/bin/python"
elif [ -f "venv/bin/python" ]; then
    PYTHON_CMD="venv/bin/python"
else
    PYTHON_CMD="python3"
fi

$PYTHON_CMD -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload


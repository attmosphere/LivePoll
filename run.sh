#!/bin/bash
echo "[*] Starting backend and frontend servers..."
cd backend && uvicorn api:app --reload --port 8080 &
cd frontend && python -m http.server 8000 &
echo "[*] Servers started successfully!"
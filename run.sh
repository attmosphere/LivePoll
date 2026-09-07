#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "${CYAN}[*]${RESET} Starting servers..."
echo -e "${YELLOW}[*]${RESET} Starting front-end server..."
# sudo systemctl start nginx ||  exit 1
live-server frontend &
echo -e "${GREEN}[+]${RESET} Front-end server started!"
cd backend || exit 1 
echo -e "${YELLOW}[*]${RESET} Starting backend server..."
uvicorn api:app --reload --port 8000 &
echo -e "${GREEN}[+]${RESET} Back-end server started!"
# cd frontend && python -m http.server 8000 &
echo -e "${GREEN}[*]${RESET} Servers started successfully!"

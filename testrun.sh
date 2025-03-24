#!/bin/bash
trap : SIGTERM SIGINT
echo $$
python -m http.server -d frontend 8001 &
FRONTEND_PID=$!
python backend/manage.py runserver &
BACKEND_PID=$!
wait
kill $FRONTEND_PID
kill $BACKEND_PID

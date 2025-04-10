#!/bin/bash
trap : SIGTERM SIGINT
python backend/manage.py runserver &
BACKEND_PID=$!
wait
kill $BACKEND_PID

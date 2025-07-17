#!/bin/bash

# Start the backend (Express)
echo "🚀 Starting backend..."
node web-server/server.mjs &

# Save the PID to stop later if needed
BACKEND_PID=$!

# Start the frontend (Vite in client/)
echo "🌐 Starting frontend..."
cd client
npm run dev

# When frontend stops, stop backend too
kill $BACKEND_PID

#!/bin/bash

echo "📦 Installing backend dependencies..."
npm install

# Start the backend (Express)
echo "🚀 Starting backend..."
node web-server/server.mjs &
BACKEND_PID=$!

echo "📦 Installing frontend dependencies..."
cd client
npm install

# Start the frontend (Vite)
echo "🌐 Starting frontend..."
npm run dev

# Kill backend when frontend stops
kill $BACKEND_PID

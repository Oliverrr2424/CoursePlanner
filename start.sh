#!/bin/bash

# CoursePlanner Setup and Start Script
set -e

echo '=== CoursePlanner Setup and Start Script ==='

# Configuration
DB_FILE=courses.db
PORT=3001
NODE_ENV=development

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo 'Installing Node.js dependencies...'
    npm install
    if [ $? -ne 0 ]; then
        echo '❌ Failed to install dependencies'
        exit 1
    fi
    echo '✅ Dependencies installed successfully'
else
    echo '✅ Dependencies already installed'
fi

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    echo 'Running database initialization...'
    node database.js
    if [ $? -ne 0 ]; then
        echo '❌ Failed to initialize database'
        exit 1
    fi
    echo '✅ Database initialized successfully'
else
    echo "✅ Database already exists: $DB_FILE"
fi

# Check required files
required_files=("index.js" "database.js" "public/index.html" "public/app.js" "public/style.css")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

echo '=== Setup Complete ==='
echo "Server will start on port $PORT"
echo "Database file: $DB_FILE"
echo "Environment: $NODE_ENV"

# Start the server
echo 'Starting server...'
echo 'Press Ctrl+C to stop the server'
echo ''

# Start server with proper error handling
node index.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo "🌐 Open http://localhost:$PORT in your browser"
    echo ""
    echo "=== Server Logs ==="
    
    # Wait for server process
    wait $SERVER_PID
else
    echo "❌ Server failed to start"
    exit 1
fi 
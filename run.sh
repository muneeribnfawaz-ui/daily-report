#!/bin/bash

# Exit immediately if any command fails (except for starting container checks)
set -e

echo "=== Starting Container Systems ==="
echo "Starting backend container system..."
# Ensures container system is running
container system start || true

# Start MongoDB container
echo "Starting MongoDB container..."
container start mongodb || true

# Start Next.js development server in the background so it doesn't block the shell
echo "Starting Next.js dev server..."
npm run dev &
DEV_PID=$!

# Give the dev server a couple of seconds to boot
sleep 2

# Open MongoDB shell
echo "Starting mongosh..."
mongosh

# Clean up dev server process when exiting mongosh
trap "kill $DEV_PID" EXIT

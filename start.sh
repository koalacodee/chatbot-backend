#!/bin/sh

# ---- Wait for DB ----
echo "Waiting for Postgres..."
until nc -z db 5432; do
  sleep 1
done
echo "Postgres is up!"

# ---- Run Prisma migrations ----
echo "Running Prisma migrations..."
bunx prisma migrate deploy

# ---- Start the app ----
echo "Starting the app..."
bun dist/main.js

#!/bin/sh

# ---- Extract host and port from DATABASE_URL ----
# DATABASE_URL format: postgresql://user:pass@host:port/dbname
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's#postgresql://[^:]+:[^@]+@([^:/]+):([0-9]+)/.*#\1#')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's#postgresql://[^:]+:[^@]+@([^:/]+):([0-9]+)/.*#\2#')

echo "Waiting for Postgres at $DB_HOST:$DB_PORT..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done
echo "Postgres is up!"

# ---- Run Prisma migrations ----
echo "Running Prisma migrations..."
bunx prisma migrate deploy

# ---- Start the app ----
echo "Starting the app..."
bun dist/main.js

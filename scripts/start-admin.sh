#!/bin/sh
echo "Running database migrations..."
npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate

echo "Running database seed (default data)..."
npx tsx packages/database/prisma/seed.ts || echo "Seed completed (or already seeded)."

echo "Starting admin portal..."
npm run start --workspace=apps/admin

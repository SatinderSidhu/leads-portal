#!/bin/sh
echo "Running database migrations..."
npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate
echo "Starting admin portal..."
npm run start --workspace=apps/admin

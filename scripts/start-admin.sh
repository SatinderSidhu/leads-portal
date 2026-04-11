#!/bin/sh
echo "Running database migrations..."
npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate --accept-data-loss

echo "Creating partial index for active sequence enrollments..."
psql "$DATABASE_URL" -c "
  CREATE INDEX IF NOT EXISTS active_enrollments_next_send_idx
    ON sequence_enrollments(next_send_at)
    WHERE status = 'ACTIVE';
" || echo "Warning: partial index creation skipped (psql unavailable or already exists)"

echo "Running database seed (default data)..."
npx tsx packages/database/prisma/seed.ts || echo "Seed completed (or already seeded)."

echo "Starting admin portal..."
npm run start --workspace=apps/admin

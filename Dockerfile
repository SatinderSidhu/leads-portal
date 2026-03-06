FROM node:20-alpine AS base

# Install dependencies only
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/customer/package.json ./apps/customer/package.json
COPY packages/database/package.json ./packages/database/package.json
RUN npm ci

# Generate Prisma client
FROM base AS prisma
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/database ./packages/database
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build admin
FROM base AS admin-builder
WORKDIR /app
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY package.json ./
COPY apps/admin ./apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/admin

# Build customer
FROM base AS customer-builder
WORKDIR /app
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY package.json ./
COPY apps/customer ./apps/customer
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/customer

# Admin production image
FROM base AS admin
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY --from=admin-builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=admin-builder /app/apps/admin/public ./apps/admin/public
COPY --from=admin-builder /app/apps/admin/package.json ./apps/admin/package.json
COPY package.json ./
COPY scripts/start-admin.sh ./scripts/start-admin.sh
EXPOSE 3000
CMD ["sh", "scripts/start-admin.sh"]

# Customer production image
FROM base AS customer
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY --from=customer-builder /app/apps/customer/.next ./apps/customer/.next
COPY --from=customer-builder /app/apps/customer/public ./apps/customer/public
COPY --from=customer-builder /app/apps/customer/package.json ./apps/customer/package.json
COPY package.json ./
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=apps/customer"]

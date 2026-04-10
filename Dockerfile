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
ARG COMMIT_SHA=unknown
WORKDIR /app
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY package.json ./
COPY apps/admin ./apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_COMMIT_SHA=$COMMIT_SHA
RUN npm run build --workspace=apps/admin

# Build app-factory
FROM base AS app-factory-builder
WORKDIR /app
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY package.json ./
COPY apps/app-factory ./apps/app-factory
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/app-factory

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
RUN apk add --no-cache postgresql-client
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY --from=admin-builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=admin-builder /app/apps/admin/public ./apps/admin/public
COPY --from=admin-builder /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=admin-builder /app/apps/admin/next.config.ts ./apps/admin/next.config.ts
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
COPY --from=customer-builder /app/apps/customer/next.config.ts ./apps/customer/next.config.ts
COPY package.json ./
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=apps/customer"]

# App Factory production image
FROM base AS app-factory
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/packages/database ./packages/database
COPY --from=app-factory-builder /app/apps/app-factory/.next ./apps/app-factory/.next
COPY --from=app-factory-builder /app/apps/app-factory/public ./apps/app-factory/public
COPY --from=app-factory-builder /app/apps/app-factory/package.json ./apps/app-factory/package.json
COPY --from=app-factory-builder /app/apps/app-factory/next.config.ts ./apps/app-factory/next.config.ts
COPY package.json ./
EXPOSE 3002
CMD ["npm", "run", "start", "--workspace=apps/app-factory"]

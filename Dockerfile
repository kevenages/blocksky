# Build stage
# Cache bust: 2026-02-01-v2
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (skip prebuild for OAuth, we generate at runtime)
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 blocksky

# Copy built output from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/public ./public

# Copy node_modules for externalized packages (firebase-admin, grpc, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R blocksky:nodejs /app

USER blocksky

# Cloud Run sets PORT environment variable
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]

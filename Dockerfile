# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Force fresh build
RUN rm -rf .output && npm run build && \
    echo "=== BUILD OUTPUT ===" && \
    ls -la .output/public/assets/*.css && \
    grep -o "styles-[A-Za-z0-9]*\.css" .output/server/index.mjs | head -1

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

# Debug: verify assets match
RUN echo "=== RUNNER STAGE ===" && \
    ls -la .output/public/assets/*.css && \
    grep -o "styles-[A-Za-z0-9]*\.css" .output/server/index.mjs | head -1

# Set ownership
RUN chown -R blocksky:nodejs /app

USER blocksky

# Cloud Run sets PORT environment variable
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]

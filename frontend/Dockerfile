# syntax=docker/dockerfile:1

# ---------------------------
# Build stage
# ---------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install OS dependencies if needed (e.g., for sharp or canvas).
# Uncomment if your project requires native deps:
# RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Build the Next.js app with ngrok backend URL
ENV NEXT_PUBLIC_API_URL=https://discerning-protonematal-jetta.ngrok-free.dev:8000/api
RUN npm run build

# ---------------------------
# Production runtime stage
# ---------------------------
FROM node:20-alpine AS runner

# Create and use non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

WORKDIR /app

# Set production env
ENV NODE_ENV=production
# Next.js listens on 3000 by default
ENV PORT=3000

# Copy only necessary artifacts from builder
# If using Next.js output tracing, copy .next/standalone for smaller image
# Fallback: copy entire node_modules and build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Prefer standalone output if available
# This directory is produced when using Next.js "output: standalone"
# It includes the minimal Node server and production deps
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# If standalone is not enabled, uncomment to copy full app:
# COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/next.config.ts ./next.config.ts
# COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Ensure runtime has the Next server entry
# For standalone, server.js is in the root provided by Next
# Expose port
EXPOSE 3000

USER nextjs

# Start the Next.js server
# For standalone mode:
CMD ["npm", "run", "start"]

# If not using standalone, use:
# CMD ["npm", "run", "start"]

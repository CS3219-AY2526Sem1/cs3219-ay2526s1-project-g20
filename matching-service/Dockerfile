# Small, modern Node image
FROM node:20-alpine AS base
WORKDIR /app

# Install only prod deps using clean cache
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

# Set env & port
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# (Optional) run as non-root
RUN addgroup -S app && adduser -S app -G app
USER app

# Optional healthcheck (expects /health route)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# Start server
CMD ["node", "src/server.js"]

# Engage - URL to PDF Converter
# Self-contained Docker image

FROM node:22-alpine

LABEL org.opencontainers.image.title="Engage"
LABEL org.opencontainers.image.description="URL to PDF Converter with AI-powered content extraction"
LABEL org.opencontainers.image.source="https://github.com/engage"
LABEL org.opencontainers.image.licenses="MIT"

# Create non-root user first (before copying files)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files (as nodejs user for correct ownership)
COPY --chown=nodejs:nodejs package.json ./

# Install production dependencies only
RUN npm install --production --no-audit --no-fund && \
    npm cache clean --force

# Copy application files (as nodejs user for correct ownership)
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs public ./public

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Switch to non-root user
USER nodejs

# Start server
CMD ["node", "src/index.js"]

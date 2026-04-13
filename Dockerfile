# syntax=docker/dockerfile:1

# Build the Vite frontend separately so the runtime image only serves static files.
FROM node:20-bookworm-slim AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build


# Install production backend dependencies in their own layer.
FROM node:20-bookworm-slim AS server-deps

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force


# Runtime image: Express API plus the built React app.
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/morning-ritual.db

COPY --from=server-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./server.js
COPY backend ./backend
COPY --from=client-builder /app/client/dist ./client/dist

RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3001
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

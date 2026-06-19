# --- Stage 1: build the React frontend ---
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/vite.config.js frontend/index.html ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm install && npm run build

# --- Stage 2: Python backend that serves the built app + API ---
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend /fe/dist ./static
ENV PORT=8000
EXPOSE 8000
# Agentic legal research activates when ANTHROPIC_API_KEY is provided at runtime.
CMD ["sh","-c","gunicorn -b 0.0.0.0:${PORT} -w 2 -t 180 app:app"]

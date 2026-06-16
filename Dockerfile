FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8000
EXPOSE 8000
# Agentic mode (live legal research) activates if ANTHROPIC_API_KEY is set at runtime.
CMD ["sh","-c","gunicorn -b 0.0.0.0:${PORT} -w 2 -t 120 app:app"]

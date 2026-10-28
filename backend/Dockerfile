# Snapgrade API. Build from this folder:  docker build -t snapgrade-api .
# Run:  docker run --rm -p 8000:8000 --env-file .env snapgrade-api
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# Dependencies first, so code-only changes reuse this layer.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Run unprivileged; the app only reads its files.
RUN useradd --create-home --uid 10001 snapgrade
USER snapgrade

EXPOSE 8000
# Render (and most hosts) set PORT; 8000 locally.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT}"]

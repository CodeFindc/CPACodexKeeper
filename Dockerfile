FROM node:20-bookworm-slim AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CPA_STATUS_HOST=0.0.0.0 \
    CPA_STATUS_PORT=8080 \
    CPA_STATUS_STATIC_DIR=/app/frontend/dist

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY main.py pyproject.toml README.md README.en.md justfile ./
COPY tests ./tests
COPY --from=frontend-build /frontend/dist ./frontend/dist

EXPOSE 8080

CMD ["python", "main.py", "combined"]

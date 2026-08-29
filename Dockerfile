FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and database migration/config files
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY pre_start.py .

# Create uploads directory structure
RUN mkdir -p app/uploads/audio

EXPOSE 8000

# Run pre-start checks (migrations/stamping) and launch the app
CMD ["sh", "-c", "python pre_start.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-1}"]


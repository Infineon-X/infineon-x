FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libopenblas-dev \
    liblapack-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port (DigitalOcean will assign PORT env variable)
EXPOSE 8080

# Health check (using urllib from standard library)
# Note: PORT env var is set by DigitalOcean, default to 8080 if not set
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import os, urllib.request; port = os.environ.get('PORT', '8080'); urllib.request.urlopen(f'http://localhost:{port}/health').read()" || exit 1

# Run the Flask app with DigitalOcean-required worker-tmp-dir flag
# Use sh -c to properly handle environment variable substitution
CMD sh -c 'gunicorn --worker-tmp-dir /dev/shm --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120 api.app:app'

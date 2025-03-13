FROM python:3.9-slim

WORKDIR /app

# Install Redis server
RUN apt-get update && apt-get install -y --no-install-recommends redis-server && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install gunicorn && \
    rm -rf ~/.cache/pip/*

# Copy application code
COPY . .

# Set environment variables
ENV FLASK_APP=wsgi.py
ENV FLASK_DEBUG=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONOPTIMIZE=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONHASHSEED=random

# Expose the port the app will run on
EXPOSE 8008

# Command to run the application
# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

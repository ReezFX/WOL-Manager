# syntax=docker/dockerfile:1.4
FROM --platform=$BUILDPLATFORM python:3.9-slim as builder

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Final stage - Multi-architecture build
FROM --platform=$TARGETPLATFORM python:3.9-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.9/site-packages/ /usr/local/lib/python3.9/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
RUN pip install psycopg2-binary
# Copy application code
COPY . .

# Set environment variables
ENV FLASK_APP=wsgi.py
ENV FLASK_CONFIG=production
ENV FLASK_DEBUG=0
ENV PYTHONUNBUFFERED=1
# Use a random string as default SECRET_KEY - should be overridden in production
ENV SECRET_KEY="CHANGE_ME_IN_PRODUCTION_ENVIRONMENT"

# Expose the port the app will run on
EXPOSE 8080

# Command to run the application
# Add a warning about SECRET_KEY
RUN echo "WARNING: For production use, please set a secure SECRET_KEY via environment variable" > /app/README.production.txt

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

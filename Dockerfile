FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy application code
COPY . .

# Set environment variables
ENV FLASK_APP=app
ENV FLASK_DEBUG=0
ENV PYTHONUNBUFFERED=1

# Expose the port the app will run on
EXPOSE 8080

# Command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "wsgi:app"]

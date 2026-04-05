# Use official slim Python runtime as a parent image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies (required for scikit-learn, etc)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies explicitly
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire ml-service codebase (including model.pkl and app.py)
COPY . .

# Cloud Run injects $PORT (default 8080), so we use that dynamically
ENV PORT 8080

# Command to run uvicorn server
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]

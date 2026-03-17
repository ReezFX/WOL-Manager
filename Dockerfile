# Updated Dockerfile

FROM python:3.8

WORKDIR /app

COPY app ./app
COPY migrations ./migrations
COPY entrypoint.sh ./entrypoint.sh

# Other instructions remain the same

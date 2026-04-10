FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-server.txt ./

RUN pip install --no-cache-dir -r requirements-server.txt

RUN for req in */requirements.txt; do \
    if [ -f "$req" ]; then \
        pip install --no-cache-dir -r "$req" 2>/dev/null || true; \
    fi; \
    done

COPY . .

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

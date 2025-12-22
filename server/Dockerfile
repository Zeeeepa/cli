FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml .
COPY src/ src/

# Install dependencies
RUN uv venv && \
    . .venv/bin/activate && \
    uv pip install -e .

# Expose port
EXPOSE 8000

# Run server
CMD [".venv/bin/python", "-m", "testdriver_proxy.main"]


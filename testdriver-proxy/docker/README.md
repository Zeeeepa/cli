# Chrome Debug Container

Docker setup for running Chrome with remote debugging support for TestUI automation.

## Quick Start

### 1. Build the Container
```bash
cd testdriver-proxy/docker
docker build -t chrome-debug:test .
```

Build time: ~5-10 minutes (first time, then cached)

### 2. Run the Container
```bash
docker run -d \
  --name chrome-debug \
  -p 3003:3003 \
  chrome-debug:test
```

### 3. Verify It's Running
```bash
# Check container status
docker ps | grep chrome-debug

# View logs
docker logs chrome-debug

# Should see:
# Starting Xvfb on :99...
# Starting socat port forwarding (3003 -> 127.0.0.1:3002)...
# Launching Chrome with remote debugging on port 3002...
```

### 4. Test the Connection
```bash
# Check Chrome DevTools Protocol endpoint
curl http://localhost:3003/json/version

# Expected response:
# {
#   "Browser": "Chrome/131.0.6778.85",
#   "Protocol-Version": "1.3",
#   "User-Agent": "Mozilla/5.0 ...",
#   "V8-Version": "13.1.201.13",
#   "WebKit-Version": "537.36 ...",
#   "webSocketDebuggerUrl": "ws://localhost:3003/devtools/browser/..."
# }
```

### 5. Connect from TestUI
```bash
# Use with testui (from host machine)
export CHROME_CDP_URL="http://localhost:3003"
testui "navigate to google.com"
```

## Container Architecture

```
Container Port Mapping:
  Host:3003 → Container:3003 (socat) → Container:3002 (Chrome Debug)

Processes:
  1. Xvfb :99 - Virtual X server for headless Chrome
  2. socat - Port forwarding from 3003 to 127.0.0.1:3002
  3. Chrome - Browser with remote debugging enabled

Filesystem:
  /tmp/chrome-profile - Chrome user data directory
  /tmp/.X11-unix - X11 socket directory
  /app/start.sh - Startup script
```

## Configuration

### Environment Variables

Set these when running the container:

```bash
docker run -d \
  -e DISPLAY=:99 \
  -e CHROME_FLAGS="--disable-gpu" \
  -p 3003:3003 \
  chrome-debug:test
```

### Chrome Flags

Modify `start.sh` to add custom Chrome flags:

```bash
/usr/bin/google-chrome-stable \
  --remote-debugging-port=3002 \
  --remote-debugging-address=0.0.0.0 \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-gpu \              # Add this
  --disable-dev-shm-usage \    # Add this for stability
  --user-data-dir=/tmp/chrome-profile \
  "https://example.com"
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs chrome-debug

# Common issues:
# 1. Port already in use
docker ps -a | grep 3003
docker stop chrome-debug && docker rm chrome-debug

# 2. Permission denied
# Ensure start.sh is executable
chmod +x start.sh
```

### Chrome Won't Launch

```bash
# Enter container for debugging
docker exec -it chrome-debug /bin/bash

# Check Chrome process
ps aux | grep chrome

# Check Xvfb
ps aux | grep Xvfb

# Test Chrome manually
DISPLAY=:99 google-chrome-stable --version
```

### Connection Refused

```bash
# Verify port forwarding
docker exec chrome-debug netstat -tlnp | grep 3003

# Test from inside container
docker exec chrome-debug curl http://127.0.0.1:3002/json/version

# Test socat
docker exec chrome-debug ps aux | grep socat
```

## Advanced Usage

### Custom Startup URL

```bash
docker run -d \
  -p 3003:3003 \
  chrome-debug:test \
  /bin/bash -c 'start.sh --url="https://myapp.com"'
```

### Mount Volume for Downloads

```bash
docker run -d \
  -p 3003:3003 \
  -v $(pwd)/downloads:/tmp/downloads \
  chrome-debug:test
```

### Network Debugging

```bash
# Expose additional ports
docker run -d \
  -p 3003:3003 \
  -p 9222:9222 \  # Alternative debug port
  chrome-debug:test
```

## Security Considerations

1. **Non-root User**: Chrome runs as UID/GID 1001 (chromeuser)
2. **No Sandbox**: `--no-sandbox` is safe in Docker but required
3. **Port Exposure**: Only expose 3003, not internal 3002
4. **Temporary Data**: Chrome profile in /tmp (cleared on restart)

## Performance

### Resource Usage
- **Memory**: ~200-500 MB (idle Chrome)
- **CPU**: < 5% (idle), 50-100% (active testing)
- **Disk**: ~1.5 GB (image size)

### Optimization Tips

```dockerfile
# Add to Dockerfile for smaller image
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Use slim base image
FROM ubuntu:22.04-slim
```

## Integration with TestUI

### Example: Full Integration

```bash
# Terminal 1: Start Chrome container
docker run -d -p 3003:3003 --name chrome-debug chrome-debug:test

# Terminal 2: Run TestUI tests
cd testdriver-proxy
export ANTHROPIC_API_KEY="your-key"
export CHROME_CDP_URL="http://localhost:3003"

# Run tests
./bin/testui "navigate to google.com and search for docker"

# Cleanup
docker stop chrome-debug && docker rm chrome-debug
```

## Development

### Rebuilding After Changes

```bash
# Stop and remove old container
docker stop chrome-debug
docker rm chrome-debug

# Rebuild with no cache
docker build --no-cache -t chrome-debug:test .

# Run new version
docker run -d -p 3003:3003 --name chrome-debug chrome-debug:test
```

### Debugging Build Issues

```bash
# Build with verbose output
docker build --progress=plain -t chrome-debug:test .

# Build specific stage
docker build --target builder -t chrome-debug:builder .
```

## Production Deployment

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  chrome-debug:
    build: .
    container_name: chrome-debug
    ports:
      - "3003:3003"
    restart: unless-stopped
    environment:
      - DISPLAY=:99
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/json/version"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

### Kubernetes

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chrome-debug
spec:
  replicas: 2
  selector:
    matchLabels:
      app: chrome-debug
  template:
    metadata:
      labels:
        app: chrome-debug
    spec:
      containers:
      - name: chrome
        image: chrome-debug:test
        ports:
        - containerPort: 3003
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

## License

This Docker configuration is part of the TestUI project.

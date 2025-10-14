# TestDriver.ai Proxy Server

> **A production-ready proxy server enabling TestDriver.ai to work with any LLM API**

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D16-green)]()

## Quick Start

```bash
# Install dependencies
npm install

# Configure API credentials
cp .env.example .env
# Edit .env with your API key

# Start server
npm start
```

## 🚀 One-Command PR Validation

For comprehensive PR validation with interactive dashboard:

```bash
npm run validate
```

This will:
- ✅ Start proxy server (port 8080)
- ✅ Start test UI application (port 4000)  
- ✅ Launch validation dashboard (port 5000)
- ✅ Run health checks
- ✅ Display all access URLs

Then open **http://localhost:5000** in your browser for interactive testing!

## Features

- ✅ Multi-provider AI support (Z.ai, OpenAI, Anthropic)
- ✅ Vision-based UI testing with screenshot analysis
- ✅ Natural language → YAML test command conversion
- ✅ AI-powered error recovery & debugging
- ✅ Automatic test scenario generation

## Documentation

📚 **[View Complete Documentation](./DOCUMENTATION.md)** 📚

The comprehensive documentation includes:
- Full API reference
- Configuration guide
- Testing instructions
- Deployment options
- Codebase analysis
- Troubleshooting guide

## Test Organization

All tests are organized in the `tests/` directory:

```
tests/
├── test_config.py           # Unit tests: Configuration
├── test_models.py           # Unit tests: Data models
├── test_proxy.py            # Unit tests: Proxy logic
├── integration/             # Integration tests
├── scripts/                 # Test runner scripts
└── ui/                      # UI tests and test application
```

## Quick Test

```bash
# Run basic tests
npm test

# Run live integration tests
cd tests/scripts
./run_live_tests.sh
```

## Project Structure

```
testdriver-proxy/
├── server.js              # Main Express.js server (830 lines)
├── DOCUMENTATION.md       # Complete documentation (800+ lines)
├── package.json           # Dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose
└── tests/                 # All tests organized by type
    ├── *.py              # Unit tests
    ├── integration/      # Integration tests
    ├── scripts/          # Test runners
    └── ui/               # UI tests
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/:version/testdriver/input` - Natural language → YAML
- `POST /api/:version/testdriver/generate` - Test generation
- `POST /api/:version/testdriver/error` - Error recovery
- `POST /api/:version/testdriver/check` - Task verification
- `POST /api/:version/testdriver/assert` - Assertions

## License

MIT License

## Links

- 📚 [Complete Documentation](./DOCUMENTATION.md)
- 🧪 [Testing Guide](./DOCUMENTATION.md#testing)
- 🚀 [Deployment Guide](./DOCUMENTATION.md#deployment)
- 🐛 [Troubleshooting](./DOCUMENTATION.md#troubleshooting)

# Cloudflare Worker for TestDriver Server

This directory contains the Cloudflare Worker configuration to expose your testdriver-server at `test.pixelium.uk`.

## 📁 Files

- **`worker.js`** - Main Cloudflare Worker code (proxy logic)
- **`wrangler.toml`** - Wrangler configuration file
- **`package.json`** - NPM scripts for deployment
- **`setup.sh`** - Quick setup script
- **`DEPLOYMENT.md`** - Comprehensive deployment guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install -g wrangler
```

### 2. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Check/install wrangler
- Authenticate with Cloudflare
- Prompt for backend URL
- Prompt for account ID
- Configure wrangler.toml
- Test locally
- Optionally deploy

### 3. Manual Setup (Alternative)

```bash
# Login to Cloudflare
wrangler login

# Edit wrangler.toml - set your account_id
# Set backend URL secret
wrangler secret put BACKEND_URL

# Test locally
wrangler dev

# Deploy
wrangler deploy
```

### 4. Configure Custom Domain

After deployment, add custom domain:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages
3. Select `testdriver-proxy`
4. Go to **Triggers** → **Add Custom Domain**
5. Enter: `test.pixelium.uk`
6. Click **Add Custom Domain**

## 🧪 Testing

```bash
# Test health endpoint
curl https://test.pixelium.uk/health

# Test API endpoint
curl https://test.pixelium.uk/api/v1/health

# Test with TestDriver CLI
TD_API_ROOT=https://test.pixelium.uk npx testdriverai --version
```

## 📚 Documentation

See **`DEPLOYMENT.md`** for detailed instructions including:
- Backend server options (direct URL vs Cloudflare Tunnel)
- Environment variables configuration
- WebSocket support
- Troubleshooting
- Security best practices
- Monitoring and logging

## 🔧 Common Commands

```bash
# Run locally
npm run dev

# Deploy to production
npm run deploy

# View logs
npm run tail

# List deployments
npm run deployments

# Rollback
npm run rollback <deployment-id>
```

## 🌐 Architecture

```
TestDriver CLI
      ↓
test.pixelium.uk (Cloudflare Worker)
      ↓
Backend Server (your testdriver-server)
```

The worker:
- Proxies HTTP requests
- Handles WebSocket connections
- Adds CORS headers
- Provides rate limiting (optional)
- Adds request tracking headers

## 🔐 Environment Variables

Set via `wrangler secret put <NAME>`:

- `BACKEND_URL` - Your backend server URL (required)
- `CORS_ORIGINS` - Allowed origins (default: `*`)
- `RATE_LIMIT` - Requests per minute (default: `100`)
- `RATE_LIMIT_ENABLED` - Enable rate limiting (default: `false`)
- `TIMEOUT` - Request timeout in ms (default: `30000`)
- `DEBUG` - Enable debug logging (default: `false`)

## 💡 Tips

- Use Cloudflare Tunnel for local/private servers
- Enable rate limiting in production
- Set specific CORS origins (not `*`) in production
- Monitor logs regularly: `npm run tail`
- Test locally before deploying: `npm run dev`

## 🆘 Need Help?

- Check `DEPLOYMENT.md` for detailed troubleshooting
- View Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Review worker.js code for customization options


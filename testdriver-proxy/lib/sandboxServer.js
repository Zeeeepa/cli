/**
 * WebSocket Sandbox Server for TestDriver
 * 
 * This module implements the WebSocket protocol that TestDriver CLI expects,
 * providing local browser automation via Playwright.
 */

const WebSocket = require('ws');
const { LocalSandbox } = require('./localSandbox');
const logger = require('../utils/logger');

class SandboxServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.sandboxes = new Map();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      logger.info('🔌 TestDriver client connected via WebSocket');
      const clientId = this.generateId();
      let authenticated = false;
      let currentSandbox = null;

      ws.on('message', async (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          logger.debug(`📨 Received: ${message.type} (requestId: ${message.requestId})`);

          let response = { 
            requestId: message.requestId,
            success: true 
          };

          // Handle different message types
          switch (message.type) {
            case 'authenticate':
              // Always accept authentication in local mode
              authenticated = true;
              response.success = true;
              logger.info('✅ Client authenticated');
              break;

            case 'create':
            case 'connect':
              if (!authenticated) {
                response.success = false;
                response.error = 'Not authenticated';
                break;
              }

              // Create or connect to sandbox
              const sandboxId = message.sandboxId || this.generateId();
              
              if (this.sandboxes.has(sandboxId)) {
                currentSandbox = this.sandboxes.get(sandboxId);
                logger.info(`🔄 Reconnected to existing sandbox: ${sandboxId}`);
              } else {
                currentSandbox = new LocalSandbox(sandboxId);
                await currentSandbox.initialize();
                this.sandboxes.set(sandboxId, currentSandbox);
                logger.info(`🆕 Created new sandbox: ${sandboxId}`);
              }

              response.success = true;
              response.sandbox = {
                instanceId: sandboxId,
                id: sandboxId,
                status: 'ready',
                ready: true
              };
              break;

            default:
              // Forward all other messages to the current sandbox
              if (!currentSandbox) {
                response.success = false;
                response.error = 'No sandbox connected';
              } else {
                const result = await currentSandbox.executeCommand(message);
                response = { ...response, ...result };
              }
          }

          // Send response back to client
          ws.send(JSON.stringify(response));
          logger.debug(`📤 Sent response for ${message.type}`);

        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            requestId: message?.requestId || 'unknown',
            success: false,
            error: error.message
          }));
        }
      });

      ws.on('close', async () => {
        logger.info('🔌 TestDriver client disconnected');
        
        // Cleanup sandbox on disconnect
        if (currentSandbox) {
          await currentSandbox.cleanup();
          this.sandboxes.delete(currentSandbox.instanceId);
        }
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

      // Handle ping/pong for keepalive
      ws.on('ping', () => {
        ws.pong();
      });
    });

    logger.info('🌐 WebSocket sandbox server initialized');
  }

  generateId() {
    return `local-${Math.random().toString(36).substring(2, 15)}`;
  }

  async cleanup() {
    // Cleanup all sandboxes
    for (const [id, sandbox] of this.sandboxes.entries()) {
      await sandbox.cleanup();
    }
    this.sandboxes.clear();

    // Close WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        logger.info('🛑 WebSocket sandbox server closed');
        resolve();
      });
    });
  }
}

module.exports = { SandboxServer };

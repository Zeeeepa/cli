/**
 * Sandbox Configuration for TestUI
 * Defines security policies for local sandbox execution
 */

const path = require('path');
const os = require('os');

module.exports = {
  // Filesystem permissions
  filesystem: {
    // Directories that can be written to
    allowWrite: [
      path.join(process.cwd(), 'screenshots'),
      path.join(process.cwd(), 'logs'),
      path.join(process.cwd(), 'testdriver-proxy', 'tests'),
      path.join(os.tmpdir(), 'testui-*'),
      '/tmp/testui-*'
    ],
    
    // Directories that cannot be read (security sensitive)
    denyRead: [
      path.join(os.homedir(), '.ssh'),
      path.join(os.homedir(), '.aws'),
      path.join(os.homedir(), '.config'),
      path.join(os.homedir(), '.gnupg'),
      '/etc/shadow',
      '/etc/passwd'
    ],
    
    // Allow reading from common system locations needed by Chrome
    allowRead: [
      '/usr',
      '/lib',
      '/lib64',
      '/opt',
      process.cwd(),
      os.tmpdir()
    ]
  },
  
  // Network permissions
  network: {
    // Domains and IPs that can be accessed
    allowedDomains: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '*.local',
      '*.localhost'
    ],
    
    // Allow binding to local ports (needed for test apps)
    allowLocalBinding: true,
    
    // Port ranges that can be accessed
    allowedPorts: [
      3000, 4000, 5000, 8000, 8080, 8888, 9000, 9876
    ]
  },
  
  // Process restrictions
  process: {
    // Maximum memory usage (in MB)
    maxMemory: 2048,
    
    // Maximum CPU time (in seconds)
    maxCpuTime: 300,
    
    // Allow spawning child processes (needed for Chrome)
    allowChildProcesses: true,
    
    // Allowed executables
    allowedExecutables: [
      'chrome',
      'chromium',
      'chromium-browser',
      'google-chrome',
      'node'
    ]
  },
  
  // Security settings
  security: {
    // If true, violations are logged but not enforced (for debugging)
    ignoreViolations: false,
    
    // Enable verbose logging of sandbox operations
    verbose: process.env.TESTUI_VERBOSE === 'true',
    
    // Maximum number of violation attempts before terminating
    maxViolations: 10
  },
  
  // Platform-specific settings
  platform: {
    // Auto-detect platform, or override with 'macos' or 'linux'
    detect: process.env.TESTUI_SANDBOX_PLATFORM || 'auto',
    
    // macOS: Use sandbox-exec
    macos: {
      sandboxProfile: 'default',
      allowNetwork: true
    },
    
    // Linux: Use bubblewrap
    linux: {
      useBubblewrap: true,
      shareNet: true,
      devBind: ['/dev']
    }
  }
};


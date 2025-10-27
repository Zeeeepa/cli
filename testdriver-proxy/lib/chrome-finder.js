/**
 * Chrome Binary Finder
 * Locates Chrome/Chromium executable across different platforms
 */

const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');

/**
 * Common Chrome installation paths by platform
 */
const CHROME_PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    `${os.homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    `${os.homedir()}/Applications/Chromium.app/Contents/MacOS/Chromium`
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/local/bin/chrome',
    '/usr/local/bin/chromium'
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`
  ]
};

/**
 * Check if a file exists and is executable
 */
function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Try to find Chrome using system PATH
 */
function findInPath() {
  const commands = [
    'google-chrome',
    'google-chrome-stable', 
    'chromium',
    'chromium-browser',
    'chrome'
  ];
  
  for (const cmd of commands) {
    try {
      const result = execSync(`which ${cmd}`, { encoding: 'utf8' }).trim();
      if (result && isExecutable(result)) {
        return result;
      }
    } catch (err) {
      // Command not found in PATH, continue
    }
  }
  
  return null;
}

/**
 * Find Chrome binary on the system
 * @returns {string|null} Path to Chrome executable, or null if not found
 */
function findChrome() {
  const platform = os.platform();
  
  // Check environment variable override first
  if (process.env.CHROME_BIN && isExecutable(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  
  // Check common installation paths for this platform
  const paths = CHROME_PATHS[platform] || [];
  for (const chromePath of paths) {
    if (fs.existsSync(chromePath) && isExecutable(chromePath)) {
      return chromePath;
    }
  }
  
  // Try to find in system PATH
  const pathResult = findInPath();
  if (pathResult) {
    return pathResult;
  }
  
  // Not found
  return null;
}

/**
 * Find Chrome and throw error if not found
 * @returns {string} Path to Chrome executable
 * @throws {Error} If Chrome is not found
 */
function findChromeOrFail() {
  const chromePath = findChrome();
  
  if (!chromePath) {
    const platform = os.platform();
    let installInstructions = '';
    
    if (platform === 'darwin') {
      installInstructions = 'Install Chrome from: https://www.google.com/chrome/';
    } else if (platform === 'linux') {
      installInstructions = 'Install Chrome with: sudo apt install chromium-browser';
    } else if (platform === 'win32') {
      installInstructions = 'Install Chrome from: https://www.google.com/chrome/';
    }
    
    throw new Error(
      `Chrome/Chromium not found on your system.\n` +
      `${installInstructions}\n` +
      `Or set CHROME_BIN environment variable to Chrome executable path.`
    );
  }
  
  return chromePath;
}

/**
 * Get Chrome version
 * @param {string} chromePath Path to Chrome executable
 * @returns {string|null} Chrome version string, or null if unable to determine
 */
function getChromeVersion(chromePath) {
  try {
    const result = execSync(`"${chromePath}" --version`, { 
      encoding: 'utf8',
      timeout: 5000
    }).trim();
    
    // Extract version number (e.g., "Google Chrome 120.0.6099.109" -> "120.0.6099.109")
    const match = result.match(/[\d.]+/);
    return match ? match[0] : null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  findChrome,
  findChromeOrFail,
  getChromeVersion,
  isExecutable
};

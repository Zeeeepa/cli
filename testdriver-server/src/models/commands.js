/**
 * TestDriver Command Definitions
 * Complete reference for all 28+ TestDriver commands with schemas
 */

const TESTDRIVER_COMMANDS = {
  // ==================== TEXT & IMAGE INTERACTION ====================
  'hover-text': {
    description: 'Find and interact with text elements on screen',
    parameters: {
      text: { type: 'string', required: true, description: 'The text to find' },
      description: { type: 'string', required: false, description: 'Context description of the element' },
      action: { type: 'enum', values: ['click', 'hover', 'double-click', 'right-click'], default: 'click' },
      timeout: { type: 'number', required: false, description: 'Timeout in milliseconds' }
    },
    example: `- command: hover-text
  text: "Sign In"
  description: "button in the header for user registration"
  action: click`
  },

  'hover-image': {
    description: 'Find and interact with UI elements by matching images',
    parameters: {
      description: { type: 'string', required: true, description: 'Description of the image to find' },
      action: { type: 'enum', values: ['click', 'hover', 'double-click', 'right-click'], default: 'click' },
      timeout: { type: 'number', required: false }
    },
    example: `- command: hover-image
  description: "Magnifying glass icon next to the search bar"
  action: click`
  },

  'match-image': {
    description: 'Verify screenshot matches template image',
    parameters: {
      description: { type: 'string', required: true },
      threshold: { type: 'number', required: false, default: 0.9 }
    },
    example: `- command: match-image
  description: "Logo in top-left corner"`
  },

  // ==================== WAITING COMMANDS ====================
  'wait': {
    description: 'Delay execution for specified duration',
    parameters: {
      timeout: { type: 'number', required: true, description: 'Duration in milliseconds' }
    },
    example: `- command: wait
  timeout: 3000`
  },

  'wait-for-text': {
    description: 'Wait for specific text to appear on screen',
    parameters: {
      text: { type: 'string', required: true },
      timeout: { type: 'number', required: false, default: 30000 }
    },
    example: `- command: wait-for-text
  text: "Welcome, Test User!"
  timeout: 10000`
  },

  'wait-for-image': {
    description: 'Wait for specific image to appear',
    parameters: {
      description: { type: 'string', required: true },
      timeout: { type: 'number', required: false, default: 30000 }
    },
    example: `- command: wait-for-image
  description: "Company logo in top-left corner"
  timeout: 8000`
  },

  // ==================== INPUT COMMANDS ====================
  'type': {
    description: 'Type text at current cursor position',
    parameters: {
      text: { type: 'string', required: true },
      delay: { type: 'number', required: false, description: 'Delay between keystrokes in ms' }
    },
    example: `- command: type
  text: "user@example.com"
  delay: 50`
  },

  'press-keys': {
    description: 'Press keyboard keys with optional modifiers',
    parameters: {
      keys: { type: 'array', required: true, description: 'Keys to press' },
      modifiers: { type: 'array', required: false, description: 'Modifier keys like Control, Shift, Alt' }
    },
    example: `- command: press-keys
  keys:
    - enter
  modifiers:
    - Control`
  },

  // ==================== SCROLLING COMMANDS ====================
  'scroll': {
    description: 'Scroll the page in specified direction',
    parameters: {
      direction: { type: 'enum', values: ['up', 'down', 'left', 'right'], required: false, default: 'down' },
      amount: { type: 'number', required: false, default: 100 }
    },
    example: `- command: scroll
  direction: down
  amount: 300`
  },

  'scroll-until-text': {
    description: 'Scroll until specific text becomes visible',
    parameters: {
      text: { type: 'string', required: true },
      direction: { type: 'enum', values: ['up', 'down'], default: 'down' },
      maxScrolls: { type: 'number', required: false, default: 10 }
    },
    example: `- command: scroll-until-text
  text: "Contact Us"
  direction: down`
  },

  'scroll-until-image': {
    description: 'Scroll until specific image becomes visible',
    parameters: {
      description: { type: 'string', required: true },
      direction: { type: 'enum', values: ['up', 'down'], default: 'down' },
      maxScrolls: { type: 'number', required: false, default: 10 }
    },
    example: `- command: scroll-until-image
  description: "Footer logo"
  direction: down`
  },

  // ==================== ASSERTION COMMANDS ====================
  'assert': {
    description: 'Verify expected state or condition',
    parameters: {
      expect: { type: 'string', required: true, description: 'Description of expected state' }
    },
    example: `- command: assert
  expect: "The registration form is visible"`
  },

  // ==================== EXECUTION COMMANDS ====================
  'exec': {
    description: 'Execute system commands or scripts',
    parameters: {
      lang: { type: 'enum', values: ['pwsh', 'bash', 'python', 'node'], required: true },
      code: { type: 'string', required: true, description: 'Code to execute' }
    },
    example: `- command: exec
  lang: pwsh
  code: |
    Write-Host "Starting test..."
    exit 0`
  },

  'run': {
    description: 'Run another YAML test file',
    parameters: {
      file: { type: 'string', required: true, description: 'Path to YAML test file' }
    },
    example: `- command: run
  file: "./snippets/login.yaml"`
  },

  // ==================== APPLICATION CONTROL ====================
  'focus-application': {
    description: 'Bring application window to focus',
    parameters: {
      name: { type: 'string', required: true, description: 'Application name' }
    },
    example: `- command: focus-application
  name: "Google Chrome"`
  },

  // ==================== MEMORY & STATE ====================
  'remember': {
    description: 'Store value in memory for later use',
    parameters: {
      key: { type: 'string', required: true },
      value: { type: 'string', required: true }
    },
    example: `- command: remember
  key: "username"
  value: "\${TD_TEST_USER}"`
  },

  // ==================== CONDITIONAL LOGIC ====================
  'if': {
    description: 'Conditional execution based on condition',
    parameters: {
      condition: { type: 'string', required: true },
      then: { type: 'array', required: true, description: 'Commands to execute if true' },
      else: { type: 'array', required: false, description: 'Commands to execute if false' }
    },
    example: `- command: if
  condition: "Login button is visible"
  then:
    - command: hover-text
      text: "Login"
      action: click`
  }
};

/**
 * Get command definition
 */
function getCommandDefinition(commandName) {
  return TESTDRIVER_COMMANDS[commandName];
}

/**
 * Get all command names
 */
function getAllCommands() {
  return Object.keys(TESTDRIVER_COMMANDS);
}

/**
 * Get command schema for LLM context
 */
function getCommandsSchema() {
  return Object.entries(TESTDRIVER_COMMANDS).map(([name, def]) => ({
    command: name,
    description: def.description,
    parameters: def.parameters,
    example: def.example
  }));
}

/**
 * Validate command structure
 */
function validateCommand(command) {
  const errors = [];
  
  if (!command.command) {
    errors.push('Command name is required');
    return { valid: false, errors };
  }

  const definition = getCommandDefinition(command.command);
  if (!definition) {
    errors.push(`Unknown command: ${command.command}`);
    return { valid: false, errors };
  }

  // Validate required parameters
  Object.entries(definition.parameters).forEach(([paramName, paramDef]) => {
    if (paramDef.required && !command[paramName]) {
      errors.push(`Missing required parameter: ${paramName}`);
    }

    // Type validation
    if (command[paramName] !== undefined) {
      const value = command[paramName];
      
      if (paramDef.type === 'number' && typeof value !== 'number') {
        errors.push(`Parameter ${paramName} must be a number`);
      }
      
      if (paramDef.type === 'string' && typeof value !== 'string') {
        errors.push(`Parameter ${paramName} must be a string`);
      }
      
      if (paramDef.type === 'array' && !Array.isArray(value)) {
        errors.push(`Parameter ${paramName} must be an array`);
      }
      
      if (paramDef.type === 'enum' && !paramDef.values.includes(value)) {
        errors.push(`Parameter ${paramName} must be one of: ${paramDef.values.join(', ')}`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

module.exports = {
  TESTDRIVER_COMMANDS,
  getCommandDefinition,
  getAllCommands,
  getCommandsSchema,
  validateCommand
};

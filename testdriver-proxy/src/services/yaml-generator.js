/**
 * YAML Test Generator Service
 * Uses LLM to generate TestDriver YAML from natural language
 */

const yaml = require('js-yaml');
const LLMProvider = require('./llm-provider');
const { getCommandsSchema } = require('../models/commands');
const { getLogger } = require('../utils/logger');
const config = require('../config');

const logger = getLogger('yaml-generator');

class YAMLGenerator {
  constructor(llmProvider = null) {
    this.llm = llmProvider || new LLMProvider();
  }

  /**
   * Generate complete YAML test from natural language description
   */
  async generateTest(description, options = {}) {
    const {
      platform = 'web',
      includeSetup = true,
      screenshot = null
    } = options;

    logger.info('Generating test:', { description, platform });

    const systemPrompt = this._buildSystemPrompt(platform, includeSetup);
    const messages = [];

    if (screenshot) {
      messages.push(this.llm.formatVisionMessage(
        `Generate a TestDriver test for: ${description}`,
        screenshot
      ));
    } else {
      messages.push({
        role: 'user',
        content: `Generate a complete TestDriver test for the following scenario:\n\n${description}`
      });
    }

    const response = await this.llm.call(messages, systemPrompt);
    const generatedText = this.llm.extractText(response);

    // Extract YAML from response
    const yamlContent = this._extractYAML(generatedText);
    
    // Validate and parse
    const test = this._validateAndParse(yamlContent);

    return {
      yaml: yamlContent,
      parsed: test,
      raw: generatedText
    };
  }

  /**
   * Generate single command from natural language
   */
  async generateCommand(instruction, context = {}) {
    const { screenshot, previousCommands = [] } = context;

    logger.info('Generating command:', { instruction });

    const systemPrompt = this._buildCommandPrompt();
    const messages = [];

    let userMessage = `Generate a single TestDriver command for: ${instruction}`;
    
    if (previousCommands.length > 0) {
      userMessage += `\n\nPrevious commands:\n${yaml.dump(previousCommands)}`;
    }

    if (screenshot) {
      messages.push(this.llm.formatVisionMessage(userMessage, screenshot));
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    const response = await this.llm.call(messages, systemPrompt);
    const generatedText = this.llm.extractText(response);

    // Extract command
    const command = this._extractCommand(generatedText);

    return {
      command,
      raw: generatedText
    };
  }

  /**
   * Generate exploratory test steps
   */
  async generateExploratorySteps(scenario, numSteps = 5) {
    logger.info('Generating exploratory steps:', { scenario, numSteps });

    const systemPrompt = `You are an expert QA automation engineer specializing in TestDriver.ai.

Generate ${numSteps} exploratory test steps (prompts only, no commands) for the following scenario.
Each step should be a clear, actionable test step that explores different aspects of the functionality.

Format your response as a YAML list of prompts:
- prompt: "First test step description"
- prompt: "Second test step description"
...

Focus on edge cases, error handling, and user workflows.`;

    const messages = [{
      role: 'user',
      content: `Scenario: ${scenario}\n\nGenerate ${numSteps} exploratory test steps.`
    }];

    const response = await this.llm.call(messages, systemPrompt);
    const generatedText = this.llm.extractText(response);

    const yamlContent = this._extractYAML(generatedText);
    const steps = yaml.load(yamlContent);

    return {
      steps,
      yaml: yamlContent
    };
  }

  /**
   * Build system prompt for test generation
   */
  _buildSystemPrompt(platform, includeSetup) {
    const commands = getCommandsSchema();
    const commandsReference = commands.map(cmd => 
      `${cmd.command}: ${cmd.description}\n${cmd.example}`
    ).join('\n\n');

    return `You are an expert test automation engineer for TestDriver.ai, a vision-based testing framework.

Your task is to generate complete, valid TestDriver YAML test files from natural language descriptions.

## TestDriver YAML Format

version: ${config.testdriver.version}
steps:
  - prompt: "High-level description of what this step does"
    commands:
      - command: command-name
        param1: value1
        param2: value2

## Available Commands

${commandsReference}

## Platform: ${platform}

${includeSetup ? this._getSetupInstructions(platform) : ''}

## Guidelines

1. **Be Visual**: Describe UI elements by what they look like, not their behavior
   - Good: "Blue button with text 'Sign In' in top-right corner"
   - Bad: "Button that logs the user in"

2. **Use Selectorless Approach**: Focus on text and visual appearance
   - Prefer hover-text over complex selectors
   - Use descriptions that match what a human would see

3. **Include Waits**: Add wait-for-text or wait-for-image after actions that trigger changes

4. **Add Assertions**: Verify expected states with assert commands

5. **Handle Edge Cases**: Include error scenarios and boundary conditions

6. **Environment Variables**: Use \${TD_*} for credentials and configuration
   - Example: \${TD_TEST_USERNAME}, \${TD_TEST_PASSWORD}, \${TD_WEBSITE}

7. **Valid YAML**: Ensure proper indentation (2 spaces) and syntax

## Response Format

Provide ONLY the YAML content, wrapped in a markdown code block:

\`\`\`yaml
version: \${config.testdriver.version}
steps:
  - prompt: "Description"
    commands:
      - command: ...
\`\`\`

Do not include explanations outside the code block.`;
  }

  /**
   * Build system prompt for single command generation
   */
  _buildCommandPrompt() {
    const commands = getCommandsSchema();
    const commandsList = commands.map(cmd => 
      `- ${cmd.command}: ${cmd.description}`
    ).join('\n');

    return `You are an expert at generating TestDriver commands.

Generate a SINGLE TestDriver command from the instruction.

Available commands:
${commandsList}

Respond with ONLY the YAML for the command, like:

\`\`\`yaml
- command: hover-text
  text: "Sign In"
  description: "sign in button"
  action: click
\`\`\``;
  }

  /**
   * Get platform-specific setup instructions
   */
  _getSetupInstructions(platform) {
    const instructions = {
      web: `## Web Testing Setup

Typical test structure:
1. Focus browser application
2. Navigate to URL (or ensure it's loaded)
3. Wait for page load
4. Perform test actions
5. Assert expected results`,
      
      desktop: `## Desktop Testing Setup

Typical test structure:
1. Launch or focus application
2. Wait for application to be ready
3. Perform test actions
4. Assert expected results`,
      
      mobile: `## Mobile Testing Setup

Typical test structure:
1. Ensure app is launched
2. Wait for app to be ready
3. Perform test actions
4. Assert expected results`
    };

    return instructions[platform] || instructions.web;
  }

  /**
   * Extract YAML from LLM response
   */
  _extractYAML(text) {
    // Try to find YAML in code blocks
    const yamlBlockMatch = text.match(/```(?:yaml|yml)?\n([\s\S]*?)\n```/);
    if (yamlBlockMatch) {
      return yamlBlockMatch[1].trim();
    }

    // Try to find YAML without code blocks
    const lines = text.split('\n');
    const yamlLines = [];
    let inYAML = false;

    for (const line of lines) {
      if (line.trim().startsWith('version:') || line.trim().startsWith('steps:')) {
        inYAML = true;
      }
      
      if (inYAML) {
        yamlLines.push(line);
      }
    }

    if (yamlLines.length > 0) {
      return yamlLines.join('\n').trim();
    }

    // Return as-is if can't extract
    return text.trim();
  }

  /**
   * Extract command from LLM response
   */
  _extractCommand(text) {
    const yamlContent = this._extractYAML(text);
    const parsed = yaml.load(yamlContent);

    // Handle both single command and array
    if (Array.isArray(parsed)) {
      return parsed[0];
    }

    return parsed;
  }

  /**
   * Validate and parse YAML
   */
  _validateAndParse(yamlContent) {
    try {
      const parsed = yaml.load(yamlContent);

      // Basic validation
      if (!parsed.version) {
        throw new Error('Missing version field');
      }

      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        throw new Error('Missing or invalid steps array');
      }

      return parsed;
    } catch (error) {
      logger.error('YAML validation error:', error);
      throw new Error(`Invalid YAML: ${error.message}`);
    }
  }
}

module.exports = YAMLGenerator;

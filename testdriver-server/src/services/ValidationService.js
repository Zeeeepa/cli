const yaml = require('js-yaml');
const config = require('../config');
const { getLogger } = require('../utils/logger');
const logger = getLogger('validation-service');

class ValidationService {
  constructor(commandValidator) {
    this.commandValidator = commandValidator;
  }

  validateYAML(yamlContent) {
    logger.info('Validating YAML test');
    const errors = [];
    const warnings = [];
    let parsed = null;

    try {
      parsed = yaml.load(yamlContent);

      if (!parsed.version) {
        errors.push('Missing version field');
      } else if (parsed.version !== config.testdriver.version) {
        warnings.push(`Version ${parsed.version} differs from current ${config.testdriver.version}`);
      }

      if (!parsed.steps) {
        errors.push('Missing steps field');
      } else if (!Array.isArray(parsed.steps)) {
        errors.push('Steps must be an array');
      } else {
        this._validateSteps(parsed.steps, errors, warnings);
      }

      const isValid = errors.length === 0;
      logger.info('YAML validation complete:', { valid: isValid, errors: errors.length });

      return {
        valid: isValid,
        errors,
        warnings,
        parsed: isValid ? parsed : null,
        stepsCount: parsed?.steps?.length || 0
      };
    } catch (error) {
      logger.error('YAML parsing error:', error);
      return {
        valid: false,
        errors: [`YAML syntax error: ${error.message}`],
        warnings: [],
        parsed: null,
        stepsCount: 0
      };
    }
  }

  _validateSteps(steps, errors, warnings) {
    steps.forEach((step, index) => {
      if (!step.prompt) {
        warnings.push(`Step ${index + 1}: Missing prompt`);
      }

      if (step.commands) {
        if (!Array.isArray(step.commands)) {
          errors.push(`Step ${index + 1}: Commands must be an array`);
        } else {
          step.commands.forEach((command, cmdIndex) => {
            const validation = this.commandValidator.validateCommand(command);
            if (!validation.valid) {
              errors.push(`Step ${index + 1}, Command ${cmdIndex + 1}: ${validation.errors.join(', ')}`);
            }
          });
        }
      }
    });
  }

  validateCommand(command) {
    logger.info('Validating command:', command?.command);

    if (!command) {
      return { valid: false, errors: ['Command is required'] };
    }

    const validation = this.commandValidator.validateCommand(command);
    logger.info('Command validation complete:', { valid: validation.valid });
    return validation;
  }
}

module.exports = ValidationService;

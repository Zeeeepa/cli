const { getLogger } = require('../utils/logger');
const logger = getLogger('test-generation-service');

class TestGenerationService {
  constructor(yamlGenerator, commandValidator) {
    this.yamlGenerator = yamlGenerator;
    this.commandValidator = commandValidator;
  }

  async generateTest(params) {
    const { description, platform = 'web', includeSetup = true, screenshot = null } = params;
    logger.info('Generating test:', { description, platform });

    try {
      const result = await this.yamlGenerator.generateTest(description, {
        platform, includeSetup, screenshot
      });

      logger.info('Test generated successfully');
      return { success: true, type: 'complete', yaml: result.yaml, parsed: result.parsed };
    } catch (error) {
      logger.error('Test generation failed:', error);
      throw error;
    }
  }

  async generateExploratorySteps(params) {
    const { description, numSteps } = params;
    logger.info('Generating exploratory steps:', { description, numSteps });

    try {
      const result = await this.yamlGenerator.generateExploratorySteps(description, parseInt(numSteps));
      logger.info('Exploratory steps generated');
      return { success: true, type: 'exploratory', steps: result.steps, yaml: result.yaml };
    } catch (error) {
      logger.error('Exploratory generation failed:', error);
      throw error;
    }
  }

  async generateCommand(params) {
    const { instruction, context = {}, screenshot = null } = params;
    logger.info('Generating command:', { instruction });

    try {
      const result = await this.yamlGenerator.generateCommand(instruction, { ...context, screenshot });
      const validation = this.commandValidator.validateCommand(result.command);
      
      if (!validation.valid) {
        logger.warn('Generated command failed validation:', validation.errors);
      }

      logger.info('Command generated');
      return { success: true, command: result.command, raw: result.raw, validation };
    } catch (error) {
      logger.error('Command generation failed:', error);
      throw error;
    }
  }
}

module.exports = TestGenerationService;

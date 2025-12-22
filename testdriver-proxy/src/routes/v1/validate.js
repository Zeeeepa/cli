const express = require('express');
const { asyncHandler } = require('../../middleware/error-handler');
const container = require('../../core/container');

function createRouter() {
  const router = express.Router();
  const validationService = container.resolve('validationService');

  router.post('/', asyncHandler(async (req, res) => {
    const { yaml: yamlContent, content } = req.body;
    const input = yamlContent || content;

    if (!input) {
      return res.status(400).json({ error: { message: 'YAML content is required' } });
    }

    const result = validationService.validateYAML(input);
    res.json(result);
  }));

  router.post('/command', asyncHandler(async (req, res) => {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: { message: 'Command is required' } });
    }

    const result = validationService.validateCommand(command);
    res.json(result);
  }));

  return router;
}

module.exports = createRouter;

#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { validateYAMLSpec, safeValidateYAMLSpec } from './yaml-schema.js';
import { YAMLExecutor } from './yaml-executor.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: yaml-executor <yaml-file>');
    console.error('');
    console.error('Example:');
    console.error('  yaml-executor test.yaml');
    process.exit(1);
  }

  const yamlFile = args[0];

  try {
    // Read YAML file
    console.log(`📖 Reading YAML file: ${yamlFile}`);
    const yamlContent = await fs.readFile(yamlFile, 'utf-8');

    // Parse YAML
    const parsedYaml = yaml.load(yamlContent);

    // Validate against schema
    console.log('✅ Validating YAML schema...');
    const validation = safeValidateYAMLSpec(parsedYaml);

    if (!validation.success) {
      console.error('❌ YAML validation failed:');
      console.error(validation.errors?.format());
      process.exit(1);
    }

    const spec = validation.data!;

    console.log('');
    console.log('📋 Test Spec:');
    console.log(`   Name: ${spec.metadata.name}`);
    console.log(`   Description: ${spec.metadata.description || 'N/A'}`);
    console.log(`   Actions: ${spec.actions.length}`);
    console.log('');

    // Execute test
    console.log('🚀 Starting execution...');
    console.log('');

    const executor = new YAMLExecutor();
    const result = await executor.execute(spec);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');

    if (result.success) {
      console.log('✅ Test execution succeeded!');
      console.log('');
      console.log(`⏱️  Duration: ${result.duration}ms`);
      console.log(`📊 Actions completed: ${result.actionsCompleted}/${spec.actions.length}`);
      console.log(`📸 Screenshots: ${result.screenshots.length}`);

      if (result.screenshots.length > 0) {
        console.log('');
        console.log('Screenshots:');
        result.screenshots.forEach((path, i) => {
          console.log(`  ${i + 1}. ${path}`);
        });
      }

      if (Object.keys(result.variables).length > 0) {
        console.log('');
        console.log('Variables:');
        for (const [key, value] of Object.entries(result.variables)) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      }

      process.exit(0);
    } else {
      console.log('❌ Test execution failed!');
      console.log('');
      console.log(`⏱️  Duration: ${result.duration}ms`);
      console.log(`📊 Actions completed: ${result.actionsCompleted}/${spec.actions.length}`);
      console.log('');
      console.log('Error Details:');
      console.log(`  Action: ${result.error!.action + 1}`);
      console.log(`  Type: ${result.error!.type}`);
      console.log(`  Message: ${result.error!.message}`);
      if (result.error!.selector) {
        console.log(`  Selector: ${result.error!.selector}`);
      }

      if (result.screenshots.length > 0) {
        console.log('');
        console.log('Screenshots (before failure):');
        result.screenshots.forEach((path, i) => {
          console.log(`  ${i + 1}. ${path}`);
        });
      }

      process.exit(1);
    }
  } catch (error: any) {
    console.error('');
    console.error('❌ Fatal error:');
    console.error(error.message);
    console.error('');
    console.error(error.stack);
    process.exit(1);
  }
}

main();


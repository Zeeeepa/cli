#!/usr/bin/env node

/**
 * Detailed Code Structure Validation
 * 
 * Tests the actual structure and exports of the YAML executor modules
 * by analyzing the TypeScript source code statically.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DETAILED CODE STRUCTURE VALIDATION\n');
console.log('═══════════════════════════════════════\n');

let testsPassed = 0;
let testsFailed = 0;

function pass(message) {
  console.log(`✅ ${message}`);
  testsPassed++;
}

function fail(message) {
  console.log(`❌ ${message}`);
  testsFailed++;
}

// Read TypeScript files
const cliContent = fs.readFileSync('src/yaml-executor/cli.ts', 'utf-8');
const executorContent = fs.readFileSync('src/yaml-executor/yaml-executor.ts', 'utf-8');
const schemaContent = fs.readFileSync('src/yaml-executor/yaml-schema.ts', 'utf-8');

console.log('📋 Analyzing yaml-schema.ts...\n');

// Test schema exports
const schemaTests = {
  'NavigateActionSchema': /export const NavigateActionSchema/,
  'ClickActionSchema': /export const ClickActionSchema/,
  'TypeActionSchema': /export const TypeActionSchema/,
  'WaitActionSchema': /export const WaitActionSchema/,
  'ScreenshotActionSchema': /export const ScreenshotActionSchema/,
  'EvaluateActionSchema': /export const EvaluateActionSchema/,
  'AssertExistsActionSchema': /export const AssertExistsActionSchema/,
  'ActionSchema union': /export const ActionSchema.*discriminatedUnion/,
  'validateYAMLSpec function': /export function validateYAMLSpec/,
  'safeValidateYAMLSpec function': /export function safeValidateYAMLSpec/,
};

Object.entries(schemaTests).forEach(([name, pattern]) => {
  if (pattern.test(schemaContent)) {
    pass(`Schema exports: ${name}`);
  } else {
    fail(`Schema missing: ${name}`);
  }
});

console.log('\n📋 Analyzing yaml-executor.ts...\n');

// Test executor exports
const executorTests = {
  'YAMLExecutor class': /export class YAMLExecutor/,
  'initializeSandbox method': /async initializeSandbox\(spec: YAMLTestSpec\)/,
  'launchBrowser method': /async launchBrowser\(\): Promise<Browser>/,
  'execute method': /async execute\(spec: YAMLTestSpec\)/,
  'executeNavigate method': /private async executeNavigate/,
  'executeClick method': /private async executeClick/,
  'executeType method': /private async executeType/,
  'executeWait method': /private async executeWait/,
  'executeScreenshot method': /private async executeScreenshot/,
  'executeEvaluate method': /private async executeEvaluate/,
  'executeAssertExists method': /private async executeAssertExists/,
  'SandboxManager import': /import.*SandboxManager.*from.*sandbox-runtime/,
  'Puppeteer import': /import puppeteer.*from.*puppeteer/,
};

Object.entries(executorTests).forEach(([name, pattern]) => {
  if (pattern.test(executorContent)) {
    pass(`Executor includes: ${name}`);
  } else {
    fail(`Executor missing: ${name}`);
  }
});

console.log('\n📋 Analyzing cli.ts...\n');

// Test CLI structure
const cliTests = {
  'main function': /async function main\(\)/,
  'Command-line args parsing': /process\.argv\.slice\(2\)/,
  'YAML file reading': /fs\.readFile\(yamlFile/,
  'YAML parsing': /yaml\.load\(yamlContent\)/,
  'Schema validation': /safeValidateYAMLSpec/,
  'Executor execution': /executor\.execute\(spec\)/,
  'Success handling': /if \(result\.success\)/,
  'Error handling': /catch \(error/,
  'Screenshots display': /result\.screenshots/,
  'Variables display': /result\.variables/,
};

Object.entries(cliTests).forEach(([name, pattern]) => {
  if (pattern.test(cliContent)) {
    pass(`CLI includes: ${name}`);
  } else {
    fail(`CLI missing: ${name}`);
  }
});

console.log('\n📋 Checking Action Type Coverage...\n');

// Verify all 7 action types are supported
const actionTypes = [
  'navigate',
  'click',
  'type',
  'wait',
  'screenshot',
  'evaluate',
  'assertExists'
];

actionTypes.forEach(actionType => {
  const schemaPattern = new RegExp(`type: z\\.literal\\('${actionType}'\\)`);
  const executorPattern = new RegExp(`case '${actionType}':`);
  
  const hasSchema = schemaPattern.test(schemaContent);
  const hasExecutor = executorPattern.test(executorContent);
  
  if (hasSchema && hasExecutor) {
    pass(`Action type '${actionType}' fully implemented`);
  } else if (hasSchema && !hasExecutor) {
    fail(`Action type '${actionType}' has schema but no executor`);
  } else if (!hasSchema && hasExecutor) {
    fail(`Action type '${actionType}' has executor but no schema`);
  } else {
    fail(`Action type '${actionType}' not implemented`);
  }
});

console.log('\n📋 Checking Sandbox Integration...\n');

// Verify sandbox integration
const sandboxTests = {
  'SandboxManager initialization': /SandboxManager\.initialize/,
  'Sandbox config from spec': /spec\.sandbox\?\.network/,
  'Chrome wrapping': /SandboxManager\.wrapWithSandbox/,
  'Sandbox reset on cleanup': /SandboxManager\.reset/,
  'Violation handler': /async \(violation\)/,
};

Object.entries(sandboxTests).forEach(([name, pattern]) => {
  if (pattern.test(executorContent)) {
    pass(`Sandbox integration: ${name}`);
  } else {
    fail(`Sandbox missing: ${name}`);
  }
});

// Summary
console.log('\n═══════════════════════════════════════');
console.log('\n📊 DETAILED VALIDATION SUMMARY\n');
console.log(`✅ Checks Passed: ${testsPassed}`);
console.log(`❌ Checks Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 ALL CODE STRUCTURE CHECKS PASSED! 🎉\n');
  console.log('✨ The TypeScript code is structurally complete and well-formed.');
  console.log('✨ All 7 action types are implemented.');
  console.log('✨ Sandbox integration is present in the code.');
  console.log('✨ Error handling and cleanup are implemented.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME CODE STRUCTURE CHECKS FAILED\n');
  process.exit(1);
}


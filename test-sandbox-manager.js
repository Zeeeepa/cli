#!/usr/bin/env node

/**
 * Validation Test for Sandbox Manager Integration
 * 
 * This script validates that the sandbox-runtime integration works correctly
 * without actually compiling/running the TypeScript files (which need proper setup).
 * 
 * Tests:
 * 1. Sandbox runtime package is installed
 * 2. Required dependencies exist
 * 3. Configuration files are valid
 * 4. Package.json has correct bin entries
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 SANDBOX MANAGER VALIDATION TEST\n');
console.log('═══════════════════════════════════════\n');

let testsPassed = 0;
let testsFailed = 0;

function pass(message) {
  console.log(`✅ PASS: ${message}`);
  testsPassed++;
}

function fail(message, error) {
  console.log(`❌ FAIL: ${message}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  testsFailed++;
}

function test(name, fn) {
  try {
    fn();
  } catch (error) {
    fail(name, error.message);
  }
}

// Test 1: Check sandbox-runtime package
test('Sandbox runtime package is installed', () => {
  const packagePath = path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'sandbox-runtime');
  if (fs.existsSync(packagePath)) {
    pass('@anthropic-ai/sandbox-runtime is installed');
  } else {
    fail('@anthropic-ai/sandbox-runtime is NOT installed');
  }
});

// Test 2: Check required dependencies
test('Required dependencies are installed', () => {
  const required = ['puppeteer', 'zod', 'js-yaml'];
  required.forEach(dep => {
    const depPath = path.join(process.cwd(), 'node_modules', dep);
    if (fs.existsSync(depPath)) {
      pass(`${dep} is installed`);
    } else {
      fail(`${dep} is NOT installed`);
    }
  });
});

// Test 3: Check package.json bin entries
test('Package.json has correct bin entries', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  
  if (packageJson.bin && packageJson.bin.testui) {
    pass('testui command is configured in package.json');
  } else {
    fail('testui command is NOT configured in package.json');
  }
  
  if (packageJson.bin && packageJson.bin.testdriverai) {
    pass('testdriverai command is configured in package.json');
  } else {
    fail('testdriverai command is NOT configured in package.json');
  }
});

// Test 4: Check TypeScript source files exist
test('TypeScript source files exist', () => {
  const tsFiles = [
    'src/yaml-executor/cli.ts',
    'src/yaml-executor/yaml-executor.ts',
    'src/yaml-executor/yaml-schema.ts'
  ];
  
  tsFiles.forEach(file => {
    if (fs.existsSync(file)) {
      pass(`${file} exists`);
    } else {
      fail(`${file} does NOT exist`);
    }
  });
});

// Test 5: Check README.md exists and has content
test('README.md exists and has content', () => {
  if (fs.existsSync('README.md')) {
    const content = fs.readFileSync('README.md', 'utf-8');
    if (content.includes('TestUI') && content.includes('testui')) {
      pass('README.md exists and has correct content');
    } else {
      fail('README.md exists but missing expected content');
    }
  } else {
    fail('README.md does NOT exist');
  }
});

// Summary
console.log('\n═══════════════════════════════════════');
console.log('\n📊 VALIDATION SUMMARY\n');
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 ALL VALIDATION TESTS PASSED! 🎉\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME VALIDATION TESTS FAILED\n');
  process.exit(1);
}


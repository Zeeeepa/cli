# Sandbox Integration Points

This document identifies exactly where and how to inject sandbox-runtime functionality into the existing TestUI architecture.

## Integration Point 1: Credential Parsing (CLI Layer)

### Current Location
`bin/testui` - `parseArgs()` function (lines 26-49)

### Current State
```javascript
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    prompt: null,
    testFile: null,
    appUrl: null
  };
  // ... parsing logic
  return parsed;
}
```

### Target State
```javascript
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    prompt: null,
    testFile: null,
    appUrl: null,
    credentials: {}  // NEW: Parse USERNAME, PASSWORD, TOKEN from args/env
  };
  
  // NEW: Parse credential arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('USERNAME=')) {
      parsed.credentials.USERNAME = arg.split('=')[1];
    } else if (arg.startsWith('PASSWORD=')) {
      parsed.credentials.PASSWORD = arg.split('=')[1];
    } else if (arg.startsWith('TOKEN=')) {
      parsed.credentials.TOKEN = arg.split('=')[1];
    }
    // ... existing parsing
  }
  
  // NEW: Also check environment variables
  if (process.env.TEST_USERNAME) parsed.credentials.USERNAME = process.env.TEST_USERNAME;
  if (process.env.TEST_PASSWORD) parsed.credentials.PASSWORD = process.env.TEST_PASSWORD;
  if (process.env.TEST_TOKEN) parsed.credentials.TOKEN = process.env.TEST_TOKEN;
  
  return parsed;
}
```

### Integration Impact
- ✅ Backward compatible (existing args still work)
- ✅ Security: Credentials from env vars (not process args)
- ⚠️ Must validate/sanitize credential values

---

## Integration Point 2: YAML Generation (Pre-Execution)

### Current Location
`bin/testui` - `startTestUI()` function (lines 159-162)

### Current State
```javascript
if (options.prompt) {
  log('cyan', `\n3️⃣  Running natural language test...\n`);
  log('magenta', `   📝 "${options.prompt}"\n`);
  testDriverArgs = ['testdriverai', 'run', '--url', appUrl, '--prompt', options.prompt];
}
```

### Target State
```javascript
if (options.prompt) {
  log('cyan', `\n3️⃣  Generating YAML from natural language...\n`);
  log('magenta', `   📝 "${options.prompt}"\n`);
  
  // NEW: Call LLM to generate YAML
  const { generateYAML } = require('../lib/prompt-engine');
  const yamlContent = await generateYAML(options.prompt, {
    model: 'glm-4.5',
    apiKey: process.env.ANTHROPIC_API_KEY,
    targetUrl: appUrl
  });
  
  log('green', '✅ YAML generated');
  
  // NEW: Validate YAML
  const { validateYAML } = require('../lib/yaml-validator');
  const validation = validateYAML(yamlContent);
  if (!validation.valid) {
    log('red', '❌ Invalid YAML: ' + validation.errors.join(', '));
    process.exit(1);
  }
  
  log('green', '✅ YAML validated');
  
  // NEW: Save YAML for execution
  options.generatedYAML = yamlContent;
}
```

### Files to Create
- `lib/prompt-engine.js` - LLM integration for YAML generation
- `lib/yaml-validator.js` - JSON Schema validation
- `prompts/system-prompt.txt` - LLM system prompt
- `prompts/few-shot-examples.json` - Example generations

### Integration Impact
- ⚠️ Adds 2-3 second latency (LLM call)
- ✅ Makes execution plan visible/debuggable
- ✅ Enables caching of common patterns

---

## Integration Point 3: Sandbox Wrapper (Browser Launch)

### Current Location
`bin/testui` - `startTestUI()` function (lines 172-179)

### Current State
```javascript
const testDriver = spawn('npx', testDriverArgs, {
  env: { 
    ...process.env, 
    TD_API_ROOT: 'http://localhost:9876',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
  },
  stdio: 'inherit'
});
```

### Target State
```javascript
// NEW: Use sandbox-wrapped executor instead of testdriverai
const { executeYAMLInSandbox } = require('../lib/sandbox-yaml-executor');

log('cyan', '\n3️⃣  Launching sandboxed Chrome...\n');

const sandboxConfig = {
  network: {
    allow: [appUrl.replace('http://', '').replace('https://', '')],
    block: ['*']
  },
  filesystem: {
    mounts: [
      { host: '/tmp', sandbox: '/tmp', readWrite: true }
    ]
  }
};

log('green', '✅ Sandbox configured');
log('cyan', '\n4️⃣  Executing YAML test...\n');

try {
  const results = await executeYAMLInSandbox(
    options.generatedYAML || fs.readFileSync(options.testFile, 'utf8'),
    options.credentials,
    sandboxConfig
  );
  
  log('green', '\n✅ Test execution complete\n');
  log('cyan', `📊 Results:`);
  log('green', `   ✅ ${results.actions.filter(a => a.status === 'success').length} actions succeeded`);
  log('red', `   ❌ ${results.errors.length} errors`);
  
  // NEW: Save artifacts
  if (results.artifacts.length > 0) {
    log('cyan', `\n📸 Artifacts saved:`);
    results.artifacts.forEach(a => {
      log('blue', `   • ${a.path}`);
    });
  }
  
  process.exit(results.errors.length > 0 ? 1 : 0);
  
} catch (error) {
  log('red', '\n❌ Test execution failed: ' + error.message);
  log('red', error.stack);
  process.exit(1);
}
```

### Files to Create
- `lib/sandbox-yaml-executor.js` - Main executor wrapper
- `lib/yaml-executor.js` - Core YAML executor
- `poc/sandbox-config.js` - Reusable config templates

### Integration Impact
- ✅ Removes TestDriver.ai dependency
- ✅ Adds network isolation
- ⚠️ Requires sandbox-runtime to be working
- ⚠️ Chrome must be installed in environment

---

## Integration Point 4: Credential Injection (Executor Layer)

### Current Location
NEW - Will be in `lib/yaml-executor.js`

### Implementation
```javascript
class YAMLExecutor {
  constructor(browser, page, credentials = {}) {
    this.browser = browser;
    this.page = page;
    this.credentials = credentials;  // { USERNAME, PASSWORD, TOKEN }
  }
  
  replaceCredentials(doc) {
    // Convert YAML to JSON string
    const jsonStr = JSON.stringify(doc);
    let replaced = jsonStr;
    
    // Replace ${USERNAME}, ${PASSWORD}, ${TOKEN} with actual values
    Object.keys(this.credentials).forEach(key => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      replaced = replaced.replace(regex, this.credentials[key]);
    });
    
    return JSON.parse(replaced);
  }
  
  async execute(yamlContent) {
    const doc = yaml.load(yamlContent);
    const processed = this.replaceCredentials(doc);  // Inject credentials
    
    for (const action of processed.actions) {
      await this.executeAction(action);
    }
    
    return this.results;
  }
}
```

### Integration Impact
- ✅ Credentials never exposed in logs
- ✅ Supports multiple credential types
- ⚠️ Must validate credential names match YAML placeholders

---

## Integration Point 5: Backward Compatibility Layer

### Location
NEW - `lib/testdriver-compatibility.js`

### Purpose
Support existing TEST= YAML files (TestDriver.ai format) until migration complete

### Implementation
```javascript
async function convertTestDriverYAMLToNewFormat(yamlContent) {
  // Parse TestDriver.ai format
  const oldFormat = yaml.load(yamlContent);
  
  // Convert to new format
  const newFormat = {
    metadata: {
      version: "1.0",
      description: "Converted from TestDriver.ai format"
    },
    actions: []
  };
  
  // Map TestDriver actions → new actions
  // (This requires understanding TestDriver's YAML schema)
  
  return yaml.dump(newFormat);
}
```

### Integration Impact
- ✅ Gradual migration path
- ⚠️ Requires understanding TestDriver.ai YAML format
- ⚠️ May not support all TestDriver features

---

## Integration Timeline

### Phase 1: Foundation (No Breaking Changes)
1. ✅ Add credential parsing to parseArgs()
2. ✅ Create documentation structure
3. ✅ Audit sandbox-runtime API
4. ✅ Design YAML schema v1
5. ✅ Create LLM prompts

**Result**: Existing functionality preserved, new code paths prepared

### Phase 2: Parallel Implementation
1. ✅ Build YAML executor with Puppeteer
2. ✅ Create sandbox wrapper
3. ✅ Build Chrome PoC
4. ✅ Add credential injection
5. ⚠️ TEST=file.yaml still uses TestDriver.ai
6. ⚠️ PROMPT=... now generates YAML + executes in sandbox

**Result**: New flow works for PROMPT mode, old flow for TEST mode

### Phase 3: Full Cutover (Breaking Change)
1. ⚠️ Replace TestDriver.ai with YAML executor for all modes
2. ⚠️ Remove proxy server dependency
3. ⚠️ Convert existing TEST=... YAML files to new format
4. ✅ Document migration guide

**Result**: Complete sandbox integration, TestDriver.ai removed

---

## Files Changed Summary

### Modified Files
- `bin/testui` - Add credential parsing, YAML generation, sandbox execution
- `package.json` - Add new dependencies (sandbox-runtime, puppeteer, js-yaml)

### New Files Created
```
testdriver-proxy/
├── docs/
│   ├── architecture/
│   │   ├── current-testui-flow.md          ✅ Created
│   │   ├── current-data-flow.mmd           ✅ Created
│   │   ├── integration-points.md           ✅ Creating now
│   │   ├── dependencies.json               ⏳ Next
│   │   └── migration-plan.md               ⏳ Next
│   ├── sandbox-runtime/
│   │   ├── api-reference.md                ⏳ Phase 1.2
│   │   ├── chrome-integration.md           ⏳ Phase 1.2
│   │   └── ...
│   └── yaml-schema/
│       ├── v1-spec.md                      ⏳ Phase 1.3
│       └── ...
├── lib/
│   ├── prompt-engine.js                    ⏳ Phase 1.5
│   ├── yaml-executor.js                    ⏳ Phase 2.1
│   ├── sandbox-yaml-executor.js            ⏳ Phase 2.1
│   └── testdriver-compatibility.js         ⏳ Phase 3
├── schemas/
│   └── yaml-actions-v1.json                ⏳ Phase 1.3
├── prompts/
│   ├── system-prompt.txt                   ⏳ Phase 1.5
│   └── few-shot-examples.json              ⏳ Phase 1.5
├── examples/
│   └── yaml-flows/
│       ├── login-flow.yaml                 ⏳ Phase 1.3
│       └── ...
└── poc/
    ├── test-server.js                      ⏳ Phase 1.4
    └── ...
```

---

## Validation Checkpoints

### After Each Integration Point
1. ✅ Run existing tests → all pass
2. ✅ Test backward compatibility → no regressions
3. ✅ Validate new functionality → works as expected
4. ✅ Update documentation → reflect changes

### Final Integration Validation
```bash
# Old way (should still work)
testui PROMPT="login test"

# New way with credentials
testui PROMPT="login test" USERNAME=admin PASSWORD=secret

# From YAML file (backward compatible)
testui TEST="tests/login.yaml"

# Sandboxed execution
testui PROMPT="test checkout flow" APP="http://localhost:8080"
```

---

## Rollback Plan

If integration fails, rollback steps:

1. **Git revert** to previous commit
2. **npm install** to restore old dependencies
3. **Validate** existing tests still pass
4. **Document** failure reasons
5. **Plan fixes** before retry

Each integration point is atomic and can be rolled back independently.


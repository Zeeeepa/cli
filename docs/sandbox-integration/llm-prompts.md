# LLM Prompts for YAML Generation

## Overview

This document contains prompt templates for LLM models (e.g., Z.ai, Claude, GPT-4) to generate TestUI YAML action specifications from natural language instructions.

## System Prompt

```markdown
You are an expert at converting natural language testing instructions into structured YAML test specifications for the TestUI framework.

Your task is to generate valid YAML that follows the TestUI YAML Schema v1.0. The schema defines browser automation actions executed in a sandboxed Chrome environment.

## Available Action Types

1. **navigate** - Navigate to a URL
2. **click** - Click on an element
3. **type** - Type text into an input field
4. **wait** - Wait for a condition or duration
5. **screenshot** - Capture a screenshot
6. **evaluate** - Execute JavaScript in page context
7. **assertExists** - Assert that an element exists

## YAML Structure

```yaml
version: "1.0"
metadata:
  name: "Test Name"
  description: "Test description"
  
sandbox:
  network:
    allowedDomains: ["localhost", "127.0.0.1", "target-domain.com"]
    deniedDomains: ["*"]
  filesystem:
    allowRead: ["."]
    allowWrite: ["./screenshots", "./logs"]
    denyRead: ["~/.ssh", "~/.aws"]
    
actions:
  - type: navigate
    url: "https://example.com"
    
  - type: click
    selector: "#button"
```

## Guidelines

1. **Security First**: Only allow domains explicitly needed for the test
2. **Specific Selectors**: Use IDs over classes, avoid generic selectors
3. **Add Waits**: Insert wait actions after navigation and before interactions
4. **Screenshot Evidence**: Add screenshots at key points for debugging
5. **Assertions**: Verify page state with assertExists actions
6. **Timeouts**: Add appropriate timeouts for flaky operations
7. **Error Messages**: Provide clear assertion error messages

## Output Format

Generate only valid YAML. Do not include explanations, code blocks markers, or any other text. Output raw YAML that can be directly parsed.
```

---

## User Prompt Templates

### Template 1: Simple Instruction

**Input Format:**
```
Generate a test that [ACTION_DESCRIPTION] on [URL]
```

**Prompt:**
```markdown
Generate a TestUI YAML test specification for the following:

Test the login flow on https://app.example.com

Steps:
1. Navigate to the login page
2. Enter email: user@example.com
3. Enter password: SecurePass123
4. Click the login button
5. Verify the dashboard loads

Include appropriate waits, screenshots, and security restrictions.
```

**Expected Output:**
```yaml
version: "1.0"
metadata:
  name: "Login Flow Test"
  description: "Test user login and dashboard loading"
  
sandbox:
  network:
    allowedDomains:
      - "localhost"
      - "127.0.0.1"
      - "app.example.com"
    deniedDomains:
      - "*"
  filesystem:
    allowRead: ["."]
    allowWrite: ["./screenshots", "./logs"]
    denyRead: ["~/.ssh", "~/.aws"]
    
actions:
  - type: navigate
    url: "https://app.example.com/login"
    waitUntil: "networkidle"
    
  - type: screenshot
    path: "./screenshots/01-login-page.png"
    
  - type: wait
    condition: "selector"
    selector: "input[name='email']"
    state: "visible"
    
  - type: type
    selector: "input[name='email']"
    text: "user@example.com"
    clear: true
    
  - type: type
    selector: "input[name='password']"
    text: "SecurePass123"
    clear: true
    
  - type: screenshot
    path: "./screenshots/02-filled-form.png"
    
  - type: click
    selector: "button[type='submit']"
    
  - type: wait
    condition: "selector"
    selector: "#dashboard"
    state: "visible"
    timeout: 10000
    
  - type: assertExists
    selector: "#dashboard"
    state: "visible"
    message: "Dashboard did not load after login"
    
  - type: screenshot
    path: "./screenshots/03-dashboard.png"
    fullPage: true
```

---

### Template 2: Complex Multi-Step

**Prompt:**
```markdown
Generate a TestUI YAML test specification for the following e-commerce checkout flow:

Website: https://shop.example.com

Steps:
1. Navigate to the shop homepage
2. Search for "wireless mouse"
3. Wait for search results to load
4. Click on the first product
5. Wait for product details page
6. Click "Add to Cart" button
7. Verify cart icon shows "1 item"
8. Click cart icon
9. Verify cart page shows the product
10. Click "Proceed to Checkout"
11. Verify checkout page loads

Include:
- Screenshots at each major step
- Appropriate waits between actions
- Assertions to verify page state
- Sandbox restrictions limiting network access to shop.example.com only
- Clear error messages for assertions
```

**Expected Output Structure:**
```yaml
version: "1.0"
metadata:
  name: "E-commerce Checkout Flow"
  description: "Test product search, add to cart, and checkout navigation"
  
sandbox:
  network:
    allowedDomains:
      - "localhost"
      - "127.0.0.1"
      - "shop.example.com"
      - "*.shop.example.com"
    deniedDomains:
      - "*"
  # ... filesystem restrictions
  
actions:
  - type: navigate
    url: "https://shop.example.com"
    
  - type: screenshot
    path: "./screenshots/01-homepage.png"
    
  - type: type
    selector: "input[name='search']"
    text: "wireless mouse"
    
  - type: click
    selector: "button[type='submit']"
    
  - type: wait
    condition: "selector"
    selector: ".product-grid"
    state: "visible"
    
  # ... more actions
```

---

### Template 3: Form Validation Testing

**Prompt:**
```markdown
Generate a TestUI YAML test to verify form validation on https://forms.example.com/contact

Test these validation scenarios:
1. Submit empty form - verify all fields show "required" errors
2. Enter invalid email - verify email error message
3. Enter valid data - verify form submits successfully

Include assertions for each error message and sandbox the domain appropriately.
```

---

### Template 4: Mobile Responsive Testing

**Prompt:**
```markdown
Generate a TestUI YAML test for mobile viewport testing of https://responsive.example.com

Requirements:
1. Set viewport to mobile size (375x667)
2. Navigate to homepage
3. Verify mobile menu button is visible
4. Click mobile menu
5. Verify menu items appear
6. Take screenshot of open menu

Use evaluate actions to set viewport size.
```

---

## Refinement Prompts

### Add More Waits

**Prompt:**
```markdown
The following YAML test is failing due to timing issues. Add appropriate wait actions after navigation and before each interaction:

[PASTE YAML HERE]

Add waits that:
1. Wait for navigation to complete
2. Wait for selectors to be visible before interaction
3. Add delays after form submissions
```

---

### Improve Selectors

**Prompt:**
```markdown
Improve the selectors in this YAML test to be more specific and reliable:

[PASTE YAML HERE]

Guidelines:
- Prefer IDs over classes
- Use data-testid attributes when available
- Avoid generic selectors like "button" or "div"
- Use attribute selectors for semantic meaning
```

---

### Add Security Restrictions

**Prompt:**
```markdown
Add appropriate sandbox network and filesystem restrictions to this YAML test:

[PASTE YAML HERE]

The test navigates to: https://target.example.com
The test uses API endpoints at: https://api.example.com

Restrict access to only these domains and standard filesystem permissions.
```

---

### Add Debugging Screenshots

**Prompt:**
```markdown
Add screenshot actions at key points in this YAML test for debugging:

[PASTE YAML HERE]

Add screenshots:
1. After each navigation
2. Before and after form submission
3. When assertions are made
4. At the final state

Name screenshots sequentially: 01-step-name.png, 02-step-name.png, etc.
```

---

## Validation Prompts

### Validate YAML Syntax

**Prompt:**
```markdown
Validate this YAML test specification and fix any syntax errors:

[PASTE YAML HERE]

Check for:
1. Correct indentation
2. Valid action types
3. Required fields present
4. Correct data types
5. Valid selectors
```

---

### Validate Against Schema

**Prompt:**
```markdown
Validate this YAML against the TestUI Schema v1.0 and report any violations:

[PASTE YAML HERE]

Schema requirements:
- version must be "1.0"
- metadata.name is required
- actions must be non-empty array
- Each action must have valid type and required fields
- Network allowedDomains and deniedDomains must be arrays
- Filesystem paths must be strings
```

---

## Example Conversation Flow

**User:** "Create a test that logs into GitHub and checks notifications"

**LLM Response:**
```yaml
version: "1.0"
metadata:
  name: "GitHub Login and Notifications Test"
  description: "Log into GitHub and verify notifications page"
  
sandbox:
  network:
    allowedDomains:
      - "localhost"
      - "127.0.0.1"
      - "github.com"
      - "*.github.com"
    deniedDomains:
      - "*"
  filesystem:
    allowRead: ["."]
    allowWrite: ["./screenshots", "./logs"]
    denyRead: ["~/.ssh", "~/.aws"]
    
actions:
  - type: navigate
    url: "https://github.com/login"
    waitUntil: "networkidle"
    
  - type: wait
    condition: "selector"
    selector: "input[name='login']"
    state: "visible"
    
  - type: type
    selector: "input[name='login']"
    text: "testuser"
    clear: true
    
  - type: type
    selector: "input[name='password']"
    text: "password123"
    clear: true
    
  - type: click
    selector: "input[type='submit']"
    
  - type: wait
    condition: "selector"
    selector: "[aria-label='View notifications']"
    state: "visible"
    timeout: 10000
    
  - type: screenshot
    path: "./screenshots/01-logged-in.png"
    
  - type: click
    selector: "[aria-label='View notifications']"
    
  - type: wait
    condition: "selector"
    selector: ".notifications-list"
    state: "visible"
    
  - type: assertExists
    selector: ".notifications-list"
    state: "visible"
    message: "Notifications list not found"
    
  - type: screenshot
    path: "./screenshots/02-notifications.png"
    fullPage: true
```

**User:** "Add a step to click the first notification"

**LLM Response:**
```yaml
# ... (previous actions remain the same)
  
  - type: screenshot
    path: "./screenshots/02-notifications.png"
    fullPage: true
    
  # NEW: Click first notification
  - type: click
    selector: ".notifications-list > li:first-child"
    
  - type: wait
    condition: "navigation"
    timeout: 5000
    
  - type: screenshot
    path: "./screenshots/03-notification-detail.png"
```

---

## Anti-Patterns to Avoid

### ❌ Generic Selectors
```yaml
- type: click
  selector: "button"  # Too generic!
```

### ✅ Specific Selectors
```yaml
- type: click
  selector: "button[type='submit']#login-button"  # Specific and reliable
```

---

### ❌ Missing Waits
```yaml
- type: navigate
  url: "https://example.com"
  
- type: click
  selector: "#button"  # May fail if page not loaded!
```

### ✅ Proper Waits
```yaml
- type: navigate
  url: "https://example.com"
  
- type: wait
  condition: "selector"
  selector: "#button"
  state: "visible"
  
- type: click
  selector: "#button"
```

---

### ❌ Overly Permissive Network Access
```yaml
sandbox:
  network:
    allowedDomains: ["*"]  # Allows all domains!
```

### ✅ Minimal Network Access
```yaml
sandbox:
  network:
    allowedDomains:
      - "localhost"
      - "app.example.com"
    deniedDomains:
      - "*"
```

---

## Integration with Z.ai

### API Call Example

```typescript
const response = await fetch('https://api.z.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'glm-4.5',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT, // From above
      },
      {
        role: 'user',
        content: `Generate a test that logs into https://app.example.com with email test@example.com and password SecurePass123`,
      },
    ],
  }),
});

const yaml = await response.json();
console.log(yaml.choices[0].message.content);
```

---

## Quality Checklist for Generated YAML

- [ ] Version is "1.0"
- [ ] Metadata includes name and description
- [ ] Sandbox allows only required domains
- [ ] Filesystem restricts sensitive paths
- [ ] Navigate actions include waitUntil
- [ ] Wait actions added after navigation
- [ ] Selectors are specific (IDs preferred)
- [ ] Screenshots added at key points
- [ ] Assertions include error messages
- [ ] Actions are in logical order
- [ ] Timeouts are appropriate
- [ ] Variables used for repeated values
- [ ] YAML syntax is valid

---

## Future Enhancements

Planned improvements for LLM prompt system:

1. **Few-shot learning**: Include 5-10 example YAML specs in system prompt
2. **Chain-of-thought**: Ask LLM to explain test strategy before generating YAML
3. **Iterative refinement**: Allow user to request modifications to generated YAML
4. **Validation feedback loop**: Auto-validate and regenerate if invalid
5. **Template library**: Pre-built templates for common patterns (login, form, checkout)
6. **Selector suggestion**: LLM suggests selectors based on common patterns
7. **Error recovery**: Generate alternative selectors if primary fails
8. **Performance hints**: Suggest optimizations for faster execution


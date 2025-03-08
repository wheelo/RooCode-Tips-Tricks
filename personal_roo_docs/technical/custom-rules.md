# Custom Rules in Roo-Code: Technical Guide

## Overview

The custom rules system in Roo-Code provides a powerful mechanism for defining specific guidelines, constraints, and behaviors that the AI assistant should follow when working with your codebase. This technical guide explores the implementation details, configuration options, and advanced usage patterns for custom rules.

## Technical Implementation

### Rule File Loading Process

The rule loading process is implemented in `src/core/prompts/sections/custom-instructions.ts`. The system supports multiple rule file formats and implements a hierarchical loading strategy:

```typescript
export async function loadRuleFiles(cwd: string): Promise<string> {
  const ruleFiles = [".clinerules", ".cursorrules", ".windsurfrules"]
  let combinedRules = ""

  for (const file of ruleFiles) {
    const content = await safeReadFile(path.join(cwd, file))
    if (content) {
      combinedRules += `\n# Rules from ${file}:\n${content}\n`
    }
  }

  return combinedRules
}
```

This function scans the project root directory for any of the supported rule file formats and combines their contents into a single string. The `safeReadFile` function handles errors gracefully, allowing the system to continue even if some rule files are missing.

### Rule Application Hierarchy

Rules are applied in a specific order, with a clear priority sequence to ensure proper precedence:

```typescript
// Add mode-specific rules first if they exist
if (modeRuleContent && modeRuleContent.trim()) {
  const modeRuleFile = `.clinerules-${mode}`
  rules.push(`# Rules from ${modeRuleFile}:\n${modeRuleContent}`)
}

// Add .rooignore instructions if provided
if (options.rooIgnoreInstructions) {
  rules.push(options.rooIgnoreInstructions)
}

// Add generic rules
const genericRuleContent = await loadRuleFiles(cwd)
if (genericRuleContent && genericRuleContent.trim()) {
  rules.push(genericRuleContent.trim())
}

if (rules.length > 0) {
  sections.push(`Rules:\n\n${rules.join("\n\n")}`)
}
```

This hierarchical approach allows for:
1. Global rules that apply to all modes (`.clinerules`)
2. Mode-specific rules that only apply to a particular mode (`.clinerules-{mode}`)
3. Alternative rule file formats for compatibility (`.cursorrules`, `.windsurfrules`)

### Integration with System Prompt

Rules are integrated into the LLM's system prompt through a dedicated section:

```typescript
const joinedSections = sections.join("\n\n")

return joinedSections
  ? `
====

USER'S CUSTOM INSTRUCTIONS

The following additional instructions are provided by the user, and should be followed to the best of your ability without interfering with the TOOL USE guidelines.

${joinedSections}`
  : ""
```

This ensures that the rules are clearly delineated in the system prompt and presented as user-provided instructions that the LLM should follow.

## Custom System Prompts (New Feature)

### Overview

Roo-Code now offers an additional layer of customization beyond custom rules: **custom system prompts**. This feature allows you to completely replace the default system prompt with your own custom content for specific modes.

### Technical Implementation

Custom system prompts are implemented in `src/core/prompts/sections/custom-system-prompt.ts`:

```typescript
/**
 * Get the path to a system prompt file for a specific mode
 */
export function getSystemPromptFilePath(cwd: string, mode: Mode): string {
  return path.join(cwd, ".roo", `system-prompt-${mode}`)
}

/**
 * Loads custom system prompt from a file at .roo/system-prompt-[mode slug]
 * If the file doesn't exist, returns an empty string
 */
export async function loadSystemPromptFile(cwd: string, mode: Mode): Promise<string> {
  const filePath = getSystemPromptFilePath(cwd, mode)
  return safeReadFile(filePath)
}
```

The system prompt integration logic in `src/core/prompts/system.ts` checks for these custom prompt files:

```typescript
// Try to load custom system prompt from file
const fileCustomSystemPrompt = await loadSystemPromptFile(cwd, mode)

// If a file-based custom system prompt exists, use it
if (fileCustomSystemPrompt) {
  const roleDefinition = promptComponent?.roleDefinition || currentMode.roleDefinition
  return `${roleDefinition}

${fileCustomSystemPrompt}

${await addCustomInstructions(promptComponent?.customInstructions || currentMode.customInstructions || "", globalCustomInstructions || "", cwd, mode, { preferredLanguage })}`
}
```

### Key Aspects

When a custom system prompt file exists:
1. It completely replaces the default system prompt sections (TOOL USE, CAPABILITIES, MODES, etc.)
2. Only the role definition and custom instructions are preserved
3. The custom system prompt takes full precedence over standard formatting

### File Structure and Location

Custom system prompts are stored in:
- Directory: `.roo` in the workspace root 
- Filename: `system-prompt-[mode slug]` (e.g., `system-prompt-code` for code mode)

The `.roo` directory is automatically created if it doesn't exist.

## Comparing Custom Rules and Custom System Prompts

### Custom Rules (`.clinerules`)
- **Purpose**: Add specific guidelines while maintaining the standard system prompt structure
- **Integration**: Added to the USER'S CUSTOM INSTRUCTIONS section
- **Flexibility**: Work within the existing system prompt framework
- **Default capabilities**: Preserves all standard tools and capabilities
- **Best for**: Adding project-specific guidelines, coding standards, and workflow requirements

### Custom System Prompts (`.roo/system-prompt-[mode]`)
- **Purpose**: Completely replace the system prompt with your own custom instructions
- **Integration**: Replaces the entire system prompt except role definition
- **Flexibility**: Complete control over the AI's instructions
- **Default capabilities**: Must explicitly re-specify any capabilities from the standard prompt
- **Best for**: Advanced users who need complete control over the prompt, specialized use cases

### When to Use Each Approach

**Use Custom Rules When**:
- You want to maintain all standard capabilities
- You need to add specific guidelines or requirements
- You want to ensure compatibility with future updates

**Use Custom System Prompts When**:
- You need complete control over the prompt
- You have specialized requirements that conflict with standard capabilities
- You're an advanced user who wants to craft a highly customized experience

### Combining Both Features

You can use both features together, creating a highly customized experience:

1. **Custom System Prompt**: Sets the fundamental instructions and capabilities
2. **Custom Rules**: Added to the USER'S CUSTOM INSTRUCTIONS section, providing additional guidelines

Example workflow:
1. Create a custom system prompt file: `.roo/system-prompt-specialized`
2. Create custom rules: `.clinerules-specialized`
3. Define a custom mode in `.roomodes` with the same slug
4. The resulting prompt will use your custom system prompt with your custom rules appended

## Creating Effective Custom Modes

### Custom Mode Definition

A properly structured custom mode definition in `.roomodes` is crucial for proper operation:

```json
{
  "customModes": [
    {
      "slug": "mode-name",
      "name": "Display Name",
      "roleDefinition": "You are Roo, a specialized assistant who...",
      "groups": [
        "read",
        ["edit", { 
          "fileRegex": "\\.(md|txt)$", 
          "description": "Documentation files only" 
        }],
        "command"
      ],
      "customInstructions": "# Mode Guidelines\n\n1. Process:\n   - Step one\n   - Step two"
    }
  ]
}
```

### Critical Requirements for Custom Modes

For custom modes to work properly, these requirements must be met:

1. **File location**: The `.roomodes` file must be in the workspace root directory
2. **VSCode workspace**: VSCode must be opened directly in the directory containing `.roomodes`
3. **JSON format**: The file must contain valid JSON with all required fields
4. **Slug format**: The mode slug must be lowercase letters, numbers, and hyphens only
5. **Role definition**: Must be a non-empty string describing the mode's purpose
6. **Groups**: Must be an array (can be empty) of valid tool groups

### Group Restrictions

For more controlled access, use file pattern restrictions:

```json
["edit", { 
  "fileRegex": "\\.(md|txt)$", 
  "description": "Documentation files only" 
}]
```

This pattern is more effective than using simple string groups as it provides precise control over which files the mode can modify.

### Custom Instructions Formatting

For optimal integration with the system prompt, format custom instructions using Markdown:

```markdown
# Category Title

1. Process Step:
   - Specific guideline
   - Another guideline
   - Implementation requirement

2. Another Process Step:
   - Guideline one
   - Guideline two
```

This hierarchical approach makes the instructions more readable for both humans and the AI.

## Troubleshooting Custom Modes

If your custom modes aren't appearing in the mode dropdown, try these steps:

### 1. Verify File Locations

- Ensure `.roomodes` is in the workspace root directory
- Open VSCode directly in this directory (not a parent directory)
- Make sure the directory is recognized as the workspace root

### 2. Check JSON Syntax

- Validate your JSON syntax (use a JSON validator if needed)
- Ensure all required fields are present and properly formatted
- Check for missing commas, quotes, or braces

### 3. Restart VSCode

Sometimes VSCode needs to be restarted to recognize new custom modes:
1. Close VSCode completely
2. Reopen VSCode in the directory containing the `.roomodes` file
3. Check if the mode appears now

### 4. Try a Simplified Version

If your complex mode definition isn't working, try a minimal version:

```json
{
  "customModes": [
    {
      "slug": "simple",
      "name": "Simple Mode",
      "roleDefinition": "You are Roo, a simplified assistant.",
      "groups": ["read", "edit", "command"]
    }
  ]
}
```

### 5. Check File Permissions and Encoding

- Ensure the `.roomodes` file has appropriate read permissions
- Save the file with UTF-8 encoding to avoid character issues

### 6. Create a Global Mode

If workspace-specific modes aren't working, try a global mode:
1. Create a mode in your global settings directory:
   - Windows: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_custom_modes.json`
   - Mac: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_custom_modes.json`
   - Linux: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_custom_modes.json`

## Rule Format and Structure

### Markdown-Based Format

Rules are written in Markdown, which provides a clean, hierarchical format:

```markdown
# Category Title

1. Rule Group Title:
   - Specific guideline
   - Another guideline
   - Technical requirement

2. Another Rule Group:
   - Guideline one
   - Guideline two
```

This format offers several advantages:
- Easy to read and write for humans
- Natural hierarchical organization
- Support for rich formatting
- Compatibility with existing documentation standards

### Example Rule Categories

#### Code Style Rules

```markdown
# Code Style Rules

1. Formatting:
   - Use 2-space indentation for all files
   - Limit line length to 100 characters
   - Place opening braces on the same line
   - Use trailing commas in multi-line arrays and objects

2. Naming Conventions:
   - Use camelCase for variables and functions
   - Use PascalCase for classes and types
   - Use UPPER_SNAKE_CASE for constants
   - Prefix private methods with underscore
```

#### Security Rules

```markdown
# Security Rules

1. Input Validation:
   - Validate all user inputs before processing
   - Use parameterized queries for database operations
   - Sanitize HTML output to prevent XSS attacks
   - Validate file uploads and limit file types

2. Authentication:
   - Implement proper authentication checks on all API endpoints
   - Use secure password hashing (bcrypt) for password storage
   - Implement proper session management and token validation
   - Never store sensitive information in client-side code
```

## Mode-Specific Rules Integration

Mode-specific rules are a powerful feature that allows tailoring the AI's behavior to specific operational contexts. Each mode can have its own dedicated rule file named `.clinerules-{mode}`.

### Technical Implementation

When the system initializes a conversation in a specific mode, it looks for a corresponding rule file:

```typescript
// Load mode-specific rules if mode is provided
let modeRuleContent = ""
if (mode) {
  const modeRuleFile = `.clinerules-${mode}`
  modeRuleContent = await safeReadFile(path.join(cwd, modeRuleFile))
}
```

If found, these rules take precedence in the prompt construction:

```typescript
// Add mode-specific rules first if they exist
if (modeRuleContent && modeRuleContent.trim()) {
  const modeRuleFile = `.clinerules-${mode}`
  rules.push(`# Rules from ${modeRuleFile}:\n${modeRuleContent}`)
}
```

### Mode-Specific Rule Examples

#### Architect Mode Rules

```markdown
# Architect Mode Rules

1. Design Principles:
   - Follow Domain-Driven Design principles
   - Maintain clear separation of concerns
   - Prioritize interfaces over implementations
   - Design for extensibility and maintainability

2. Documentation Requirements:
   - Document all architectural decisions
   - Include rationale for design choices
   - Specify interfaces between components
   - Create system diagrams for complex features
```

#### Code Mode Rules

```markdown
# Code Mode Rules

1. Implementation Standards:
   - Write unit tests for all new code
   - Maintain 80%+ test coverage
   - Handle edge cases explicitly
   - Include error handling for all external operations

2. Performance Requirements:
   - Optimize database queries for large datasets
   - Implement pagination for list endpoints
   - Use caching for frequently accessed data
   - Profile code for performance bottlenecks
```

## Integration with Custom Modes

The rules system integrates seamlessly with custom modes, creating a powerful combination:

1. **Custom Mode Definition**: Define a mode with specific tool permissions
2. **Mode-Specific Rules**: Create corresponding `.clinerules-{mode}` file
3. **Combined Behavior**: The AI follows both the mode's role definition and the specific rules

Example:

```json
// Custom mode definition in .roomodes
{
  "customModes": [
    {
      "slug": "security-auditor",
      "name": "Security Auditor",
      "roleDefinition": "You are Roo, a security-focused code auditor specialized in identifying vulnerabilities and suggesting secure coding practices.",
      "groups": [
        "read",
        "edit"
      ]
    }
  ]
}
```

Paired with:

```markdown
# .clinerules-security-auditor

1. Vulnerability Assessment:
   - Check for SQL injection vectors in database queries
   - Identify possible XSS vulnerabilities in HTML rendering
   - Look for insecure direct object references
   - Check for proper input validation

2. Reporting Standards:
   - Classify issues by severity (Critical, High, Medium, Low)
   - Provide specific code locations for each finding
   - Include remediation suggestions with examples
   - Reference OWASP Top 10 or CWE IDs when applicable
```

## Advanced Implementation Details

### File Reading Safety

The rule loading system uses a safe file reading function that gracefully handles missing files and other errors:

```typescript
async function safeReadFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content.trim()
  } catch (err) {
    const errorCode = (err as NodeJS.ErrnoException).code
    if (!errorCode || !["ENOENT", "EISDIR"].includes(errorCode)) {
      throw err
    }
    return ""
  }
}
```

This ensures that:
- Missing rule files don't cause errors
- Only expected error types are silently handled
- Unexpected errors propagate for proper handling

### Rule Formatting

Rules are carefully formatted in the system prompt to ensure clear separation and proper attribution:

```typescript
if (rules.length > 0) {
  sections.push(`Rules:\n\n${rules.join("\n\n")}`)
}
```

Each rule set includes a header indicating its source:

```
# Rules from .clinerules-code:
[Content of code-specific rules]

# Rules from .clinerules:
[Content of global rules]
```

This helps the LLM understand the hierarchy and origin of different rule sets.

## Best Practices for Rule Creation

### 1. Be Specific and Clear

Rules should be specific, clear, and actionable:

```markdown
# Good Example
1. Error Handling:
   - Wrap all database operations in try/catch blocks
   - Log errors with stack traces and context information
   - Provide user-friendly error messages without exposing system details
   - Implement graceful degradation for non-critical failures
```

```markdown
# Bad Example
1. Error Handling:
   - Handle errors properly
   - Make sure errors are logged
   - Don't show bad errors to users
```

### 2. Organize Hierarchically

Use a clear hierarchical structure:
- Use headings for major categories
- Use numbered lists for rule groups
- Use bullet points for specific guidelines

```markdown
# Testing Requirements

1. Unit Tests:
   - Write tests for all new functions
   - Maintain at least 80% code coverage
   - Test edge cases and error conditions

2. Integration Tests:
   - Test API endpoints with real data
   - Verify database operations
   - Test authentication flows
```

### 3. Focus on Guidelines, Not Commands

Rules should establish guidelines rather than prescribe specific commands:

```markdown
# Good Example
1. Logging:
   - Use structured logging with consistent fields
   - Include correlation IDs for request tracing
   - Log meaningful events at appropriate levels
```

```markdown
# Bad Example
1. Logging:
   - Use logger.info("Starting process")
   - Add try/catch and call logger.error(err)
```

### 4. Align with Project Standards

Rules should reflect your project's actual standards and practices:

- Review existing code for patterns to codify
- Ensure rules match your team's agreed practices
- Update rules as project standards evolve

## Practical Applications

### 1. Consistent Code Quality

Rules can enforce consistent code quality standards:

```markdown
# Code Quality Rules

1. Test Coverage:
   - Write unit tests for all new functions
   - Maintain at least 80% code coverage
   - Test both success and error paths

2. Documentation:
   - Document all public APIs with JSDoc
   - Include examples for complex functions
   - Document all configuration options
```

### 2. Security Compliance

Rules can ensure security practices are followed:

```markdown
# Security Rules

1. Data Protection:
   - Never log sensitive personal data
   - Encrypt all PII at rest and in transit
   - Implement proper data access controls
   - Follow GDPR/CCPA data handling requirements
```

### 3. Team Conventions

Rules can codify team-specific conventions:

```markdown
# Team Conventions

1. Git Workflow:
   - Keep commits focused on single concerns
   - Write descriptive commit messages
   - Reference issue numbers in commits
   - Squash commits before merging
```

## Conclusion

The custom rules system in Roo-Code provides a powerful and flexible way to tailor the AI's behavior to your specific project requirements and team conventions. By understanding the technical implementation and following best practices for rule creation, you can create a more effective and consistent development experience with Roo-Code.

When combined with custom modes and the new custom system prompts feature, Roo-Code offers a comprehensive system for defining both the capabilities and behavioral guidelines for AI-assisted development, ensuring that the assistance you receive aligns perfectly with your project's needs.
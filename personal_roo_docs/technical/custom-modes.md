# Custom Modes in Roo-Code: Technical Guide

## Overview

The custom modes system in Roo-Code provides a powerful mechanism for defining specialized AI assistant behaviors with precise control over capabilities, permissions, and behaviors. This technical guide explores the implementation details, configuration options, and advanced patterns for creating and using custom modes.

## Core Architecture

### Mode Definition Structure

At its core, a mode in Roo-Code is defined by a structured configuration object:

```typescript
export interface ModeConfig {
  slug: string              // Unique identifier (e.g., "code", "architect")
  name: string              // Display name (e.g., "Code", "Architect")
  roleDefinition: string    // Description of the mode's role and capabilities
  groups: readonly GroupEntry[] // Allowed tool groups with optional file restrictions
  customInstructions?: string // Optional additional instructions
  source?: "global" | "project" // Where this mode was loaded from
}
```

Custom modes extend this interface and are loaded from JSON configuration files:

```typescript
export interface CustomModeConfig extends ModeConfig {
  // Custom modes have the same fields as standard modes
  // but are loaded from external configuration
}

export type GroupOptions = {
  fileRegex?: string    // Regular expression pattern
  description?: string  // Human-readable description of the pattern
}

// Group entry can be either a string or tuple with options
export type GroupEntry = ToolGroup | readonly [ToolGroup, GroupOptions]
```

### Mode Loading Implementation

Custom modes are loaded from configuration files in two key locations:

1. **Workspace-specific**: `.roomodes` in the workspace root directory
2. **Global**: `cline_custom_modes.json` in the VSCode global storage directory

The loading is implemented in `src/core/mode-validator.ts`:

```typescript
// Simplified loading logic
async function loadCustomModes(): Promise<CustomModeConfig[]> {
  // Try workspace-specific modes first
  const workspaceModes = await loadWorkspaceCustomModes()
  
  // Load global modes
  const globalModes = await loadGlobalCustomModes()
  
  // Workspace modes take precedence over global modes with the same slug
  const workspaceSlugs = new Set(workspaceModes.map(mode => mode.slug))
  const filteredGlobalModes = globalModes.filter(mode => !workspaceSlugs.has(mode.slug))
  
  return [...workspaceModes, ...filteredGlobalModes]
}
```

### Configuration Validation

Mode configurations are strictly validated to ensure they meet required criteria:

```typescript
// From src/core/mode-validator.ts
function validateModeConfig(config: any): ModeConfig | null {
  // Ensure all required fields are present
  if (!config.slug || !config.name || !config.roleDefinition) {
    return null
  }
  
  // Validate slug format (lowercase, numbers, hyphens)
  if (!config.slug.match(/^[a-z0-9-]+$/)) {
    return null
  }
  
  // Validate groups
  if (!Array.isArray(config.groups)) {
    return null
  }
  
  // Parse and validate groups
  const validatedGroups: ModeGroup[] = []
  for (const group of config.groups) {
    if (typeof group === 'string') {
      // Simple group
      if (isValidToolGroup(group)) {
        validatedGroups.push(group)
      }
    } else if (Array.isArray(group) && group.length === 2) {
      // Group with file restriction
      const [groupName, restriction] = group
      if (isValidToolGroup(groupName) && 
          typeof restriction === 'object' && 
          restriction.fileRegex && 
          restriction.description) {
        validatedGroups.push([groupName, restriction])
      }
    }
  }
  
  return {
    slug: config.slug,
    name: config.name,
    roleDefinition: config.roleDefinition,
    groups: validatedGroups,
    customInstructions: config.customInstructions || ""
  }
}
```

## Permission System Implementation

### Tool Groups

Custom modes use a permission system based on tool groups:

```typescript
// Available tool groups
const TOOL_GROUPS = {
  read: ["read_file", "search_files", "list_files", "list_code_definition_names"],
  edit: ["apply_diff", "write_to_file", "insert_content", "search_and_replace"],
  browser: ["browser_action"],
  command: ["execute_command"],
  mcp: ["use_mcp_tool", "access_mcp_resource"]
}
```

Each mode can include any combination of these groups, with optional file restrictions for greater control.

### File Restriction Implementation

File restrictions allow fine-grained control over which files a mode can edit:

```typescript
// Helper functions for working with groups
function getGroupName(group: GroupEntry): ToolGroup {
  if (typeof group === "string") {
    return group
  }
  return group[0]
}

function getGroupOptions(group: GroupEntry): GroupOptions | undefined {
  return Array.isArray(group) ? group[1] : undefined
}

// Helper to check if a file path matches a regex pattern
function doesFileMatchRegex(filePath: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern)
    return regex.test(filePath)
  } catch (error) {
    console.error(`Invalid regex pattern: ${pattern}`, error)
    return false
  }
}

// Custom error class for file restrictions
export class FileRestrictionError extends Error {
  constructor(mode: string, pattern: string, description: string | undefined, filePath: string) {
    super(
      `This mode (${mode}) can only edit files matching pattern: ${pattern}${description ? ` (${description})` : ""}. Got: ${filePath}`,
    )
    this.name = "FileRestrictionError"
  }
}

// Implementation of tool permission checking with file restrictions
export function isToolAllowedForMode(
  tool: string,
  modeSlug: string,
  customModes: ModeConfig[],
  toolRequirements?: Record<string, boolean>,
  toolParams?: Record<string, any>,
  experiments?: Record<string, boolean>,
): boolean {
  // Always allow certain tools regardless of mode
  if (ALWAYS_AVAILABLE_TOOLS.includes(tool as any)) {
    return true
  }

  // Check experimental feature flags
  if (experiments && tool in experiments) {
    if (!experiments[tool]) {
      return false
    }
  }

  // Check tool requirements
  if (toolRequirements && tool in toolRequirements) {
    if (!toolRequirements[tool]) {
      return false
    }
  }

  // Get the mode configuration
  const mode = getModeBySlug(modeSlug, customModes)
  if (!mode) {
    return false
  }

  // Check if tool is in any of the mode's groups
  for (const group of mode.groups) {
    const groupName = getGroupName(group)
    const options = getGroupOptions(group)
    const groupConfig = TOOL_GROUPS[groupName]

    // If tool isn't in this group, continue checking other groups
    if (!groupConfig.tools.includes(tool)) {
      continue
    }

    // If no restrictions, allow the tool
    if (!options) {
      return true
    }

    // For edit group, check file regex if specified
    if (groupName === "edit" && options.fileRegex) {
      const filePath = toolParams?.path
      if (
        filePath &&
        (toolParams.diff || toolParams.content || toolParams.operations) &&
        !doesFileMatchRegex(filePath, options.fileRegex)
      ) {
        throw new FileRestrictionError(mode.name, options.fileRegex, options.description, filePath)
      }
    }

    return true
  }

  return false
}
```

This is used to validate file operations:

```typescript
// From src/core/Cline.ts
async function validateFileOperation(path: string, operation: string): Promise<boolean> {
  const currentMode = this.currentMode
  
  // Check if edit group is allowed
  if (!this.isToolGroupAllowed("edit")) {
    throw new Error(`${operation} operation not allowed in ${currentMode.name} mode`)
  }
  
  // Check file restriction
  if (!checkFileRestriction(path, currentMode)) {
    const editGroup = currentMode.groups.find(g => 
      Array.isArray(g) && g[0] === "edit") as [string, FileRestriction]
    
    throw new FileRestrictionError(
      `File ${path} does not match the allowed pattern for ${currentMode.name} mode`,
      editGroup[1].fileRegex,
      editGroup[1].description
    )
  }
  
  return true
}
```

## Mode Integration Points

### Integration with System Prompt

Modes are integrated into the system prompt, influencing how the AI behaves:

```typescript
// From src/core/prompts/system.ts
async function buildSystemPrompt(mode: string, cwd: string): Promise<string> {
  // Get current mode config
  const currentMode = getModeConfig(mode)
  
  // Include mode information in the prompt
  return `
You are Roo, ${currentMode.roleDefinition}

====

TOOL USE

${await getToolDescriptionsForMode(currentMode)}

// ...other sections...

====

MODES

${await getModesSection(currentMode)}

// ...remaining prompt...
`
}
```

### Integration with Tool Access Control

Modes control which tools the AI can use:

```typescript
// From src/core/Cline.ts
isToolAllowed(toolName: string): boolean {
  const allowedGroups = this.currentMode.groups.map(group => 
    typeof group === 'string' ? group : group[0]
  )
  
  // Find which group contains this tool
  for (const [groupName, tools] of Object.entries(TOOL_GROUPS)) {
    if (tools.includes(toolName)) {
      return allowedGroups.includes(groupName)
    }
  }
  
  return false
}
```

### Integration with Custom Rules

Modes can have mode-specific custom rules:

```typescript
// From src/core/prompts/sections/custom-instructions.ts
async function addCustomInstructions(
  modeInstructions: string,
  globalInstructions: string,
  cwd: string,
  mode?: string
): Promise<string> {
  const sections = []
  const rules = []
  
  // Load mode-specific rules if mode is provided
  let modeRuleContent = ""
  if (mode) {
    const modeRuleFile = `.clinerules-${mode}`
    modeRuleContent = await safeReadFile(path.join(cwd, modeRuleFile))
  }
  
  // Add mode-specific rules first if they exist
  if (modeRuleContent && modeRuleContent.trim()) {
    const modeRuleFile = `.clinerules-${mode}`
    rules.push(`# Rules from ${modeRuleFile}:\n${modeRuleContent}`)
  }
  
  // ...add other rules...
  
  return rules.join("\n\n")
}
```

## File Structure and Configuration

### Workspace-specific Custom Modes

Custom modes are defined in the `.roomodes` file in JSON format:

```json
{
  "customModes": [
    {
      "slug": "documentation",
      "name": "Documentation",
      "roleDefinition": "You are Roo, a documentation specialist focused on creating clear, comprehensive documentation for software projects.",
      "groups": [
        "read",
        ["edit", { 
          "fileRegex": "\\.(md|txt|rst|adoc)$", 
          "description": "Documentation files only" 
        }],
        "command"
      ],
      "customInstructions": "When creating documentation, follow these guidelines:\n- Use clear, concise language\n- Include examples for complex concepts\n- Structure with appropriate headings"
    }
  ]
}
```

### Global Custom Modes

Global custom modes are stored in the VSCode global storage directory:

```
Windows: %APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_custom_modes.json
Mac: ~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_custom_modes.json
Linux: ~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_custom_modes.json
```

The format is identical to workspace-specific modes.

## Advanced Mode Configuration Techniques

### 1. File Pattern Restrictions

Control which files a mode can edit using regular expressions:

```json
["edit", { 
  "fileRegex": "\\.(ts|tsx)$", 
  "description": "TypeScript files only" 
}]
```

This allows a mode to read any file but only edit files matching the pattern.

### 2. Multi-stage Mode Chains

Create sequences of specialized modes:

```json
[
  {
    "slug": "planner",
    "name": "Planner",
    "roleDefinition": "You are Roo, a project planning specialist...",
    "groups": ["read"]
  },
  {
    "slug": "implementer",
    "name": "Implementer",
    "roleDefinition": "You are Roo, a code implementation specialist...",
    "groups": ["read", "edit", "command"]
  },
  {
    "slug": "tester",
    "name": "Tester",
    "roleDefinition": "You are Roo, a quality assurance specialist...",
    "groups": ["read", "command"]
  }
]
```

These can be used sequentially to move through planning, implementation, and testing phases.

### 3. Domain-Specific Modes

Create modes tailored to specific domains:

```json
{
  "slug": "data-scientist",
  "name": "Data Scientist",
  "roleDefinition": "You are Roo, a data science specialist who excels at data analysis, visualization, and machine learning...",
  "groups": [
    "read",
    ["edit", { 
      "fileRegex": "\\.(py|ipynb|r|sql)$", 
      "description": "Data science files only" 
    }],
    "command"
  ],
  "customInstructions": "# Data Science Guidelines\n\n- Always check for data quality issues\n- Ensure models are validated properly\n- Document analysis methodology"
}
```

### 4. Security-Focused Modes

Create modes with enhanced security considerations:

```json
{
  "slug": "security-auditor",
  "name": "Security Auditor",
  "roleDefinition": "You are Roo, a cybersecurity specialist focused on identifying security vulnerabilities and suggesting remediations...",
  "groups": [
    "read",
    ["edit", { 
      "fileRegex": "\\.(md|txt)$", 
      "description": "Documentation files only for reports" 
    }]
  ],
  "customInstructions": "# Security Audit Protocol\n\n1. Check for common vulnerabilities (OWASP Top 10)\n2. Validate input sanitization\n3. Review authorization mechanisms\n4. Assess data protection measures"
}
```

## Technical Implementation of Mode Switching

Mode switching is implemented in `ClineProvider.ts`:

```typescript
async switchMode(modeSlug: string): Promise<void> {
  // Find mode config by slug
  const modeConfig = await this.getMode(modeSlug)
  if (!modeConfig) {
    throw new Error(`Mode not found: ${modeSlug}`)
  }
  
  // Update current mode
  this.currentMode = modeSlug
  await this.updateGlobalState("currentMode", modeSlug)
  
  // Reinitialize Cline with new mode
  this.cline = new Cline(
    // Initialization parameters with new mode...
  )
  
  // Notify webview of mode change
  await this.postMessageToWebview({
    type: "modeChanged",
    mode: modeSlug
  })
}
```

### Mode Switching Tool

The AI can request mode switching using the `switch_mode` tool:

```typescript
// From src/core/Cline.ts
case "switch_mode": {
  try {
    const modeSlug = block.params.mode_slug
    const reason = block.params.reason || "No reason provided"
    
    // Verify mode exists
    const targetMode = await this.providerRef.deref()?.getMode(modeSlug)
    if (!targetMode) {
      pushToolResult(
        formatResponse.toolError(`Failed to switch mode: mode '${modeSlug}' not found`)
      )
      break
    }
    
    // Request user confirmation
    const result = await this.ask("switch_mode", {
      fromMode: this.currentMode.name,
      toMode: targetMode.name,
      reason
    })
    
    if (result === "yesButtonClicked") {
      // User approved, switch mode
      await this.providerRef.deref()?.switchMode(modeSlug)
      pushToolResult(`Successfully switched to ${targetMode.name} mode.`)
    } else {
      // User declined
      pushToolResult(`Mode switch to ${targetMode.name} was declined.`)
    }
  } catch (error) {
    await handleError("switching mode", error)
  }
  break
}
```

## Complete Custom Mode Examples

### 1. Technical Writing Mode

```json
{
  "slug": "tech-writer",
  "name": "Technical Writer",
  "roleDefinition": "You are Roo, a specialized technical writer focused on creating clear, accessible documentation for developers and end-users. Your expertise includes technical accuracy, information architecture, and audience-appropriate language.",
  "groups": [
    "read",
    ["edit", { 
      "fileRegex": "\\.(md|txt|adoc|rst|html)$", 
      "description": "Documentation files only" 
    }],
    "command"
  ],
  "customInstructions": "# Technical Writing Guidelines\n\n1. Document Structure:\n   - Use clear hierarchical heading structure\n   - Provide a table of contents for documents over 1000 words\n   - Include version information and dates\n\n2. Content Standards:\n   - Define technical terms on first use\n   - Use consistent terminology throughout\n   - Include code examples for developer-facing documentation\n   - Provide screenshots for UI documentation\n\n3. Style Guide:\n   - Use active voice when possible\n   - Short, clear sentences (aim for <25 words)\n   - Bulleted lists for sequential steps\n   - Code blocks for all code, commands, and file paths"
}
```

### 2. Database Specialist Mode

```json
{
  "slug": "db-specialist",
  "name": "Database Specialist",
  "roleDefinition": "You are Roo, a database specialist with deep expertise in database design, query optimization, and data modeling. You excel at creating efficient schemas, writing performant queries, and solving complex data problems.",
  "groups": [
    "read",
    ["edit", { 
      "fileRegex": "\\.(sql|prisma|graphql|json|js|ts|py)$", 
      "description": "Database and data model files" 
    }],
    "command",
    "browser"
  ],
  "customInstructions": "# Database Best Practices\n\n1. Schema Design:\n   - Normalize to appropriate level (usually 3NF)\n   - Use appropriate data types and constraints\n   - Document all tables and relationships\n   - Create indexes for frequently queried columns\n\n2. Query Optimization:\n   - Analyze execution plans for complex queries\n   - Use appropriate join types\n   - Consider query caching for expensive operations\n   - Paginate large result sets\n\n3. Security Measures:\n   - Parameterize all queries to prevent injection\n   - Implement least privilege access\n   - Encrypt sensitive data at rest\n   - Audit access to sensitive data"
}
```

### 3. DevOps Engineer Mode

```json
{
  "slug": "devops",
  "name": "DevOps Engineer",
  "roleDefinition": "You are Roo, a DevOps engineer specialized in CI/CD pipelines, infrastructure as code, and deployment automation. You excel at creating scalable, maintainable deployment solutions and developer workflows.",
  "groups": [
    "read",
    ["edit", { 
      "fileRegex": "\\.(ya?ml|tf|hcl|json|toml|sh|ps1|js|ts)$", 
      "description": "Infrastructure and configuration files" 
    }],
    "command",
    "browser"
  ],
  "customInstructions": "# DevOps Guidelines\n\n1. Infrastructure as Code:\n   - Use declarative syntax over imperative\n   - Parameterize environment-specific values\n   - Version all infrastructure definitions\n   - Include comprehensive documentation\n\n2. CI/CD Practices:\n   - Design pipelines for parallel execution\n   - Implement proper error handling and notifications\n   - Include automated testing at appropriate stages\n   - Enable rollback mechanisms\n\n3. Security Standards:\n   - Scan infrastructure as code for vulnerabilities\n   - Implement least privilege principle\n   - Use secrets management for credentials\n   - Enable comprehensive logging and monitoring"
}
```

## Technical Implementation Details

### Mode Validation

Modes are validated using the `validateMode` function:

```typescript
export function validateMode(mode: unknown): ModeConfig | null {
  if (!mode || typeof mode !== 'object') {
    return null
  }
  
  const { slug, name, roleDefinition, groups, customInstructions } = mode as any
  
  if (!slug || typeof slug !== 'string' || !slug.match(/^[a-z0-9-]+$/)) {
    return null
  }
  
  if (!name || typeof name !== 'string') {
    return null
  }
  
  if (!roleDefinition || typeof roleDefinition !== 'string') {
    return null
  }
  
  if (!Array.isArray(groups)) {
    return null
  }
  
  // Validate each group
  for (const group of groups) {
    if (!isValidGroup(group)) {
      return null
    }
  }
  
  return {
    slug,
    name,
    roleDefinition,
    groups,
    customInstructions: customInstructions || ''
  }
}
```

### Loading from JSON Files

Custom modes are loaded from JSON files using a secure parsing approach:

```typescript
async function loadCustomModesFromFile(filePath: string): Promise<ModeConfig[]> {
  try {
    // Check if file exists
    if (!await fileExists(filePath)) {
      return []
    }
    
    // Read and parse file
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(content)
    
    if (!parsed.customModes || !Array.isArray(parsed.customModes)) {
      return []
    }
    
    // Validate each mode
    return parsed.customModes
      .map(mode => validateMode(mode))
      .filter(Boolean) as ModeConfig[]
  } catch (error) {
    console.error(`Error loading custom modes from ${filePath}:`, error)
    return []
  }
}
```

### Mode Persistence

Current mode is persisted in VSCode's global state:

```typescript
async function persistCurrentMode(mode: string): Promise<void> {
  await this.updateGlobalState("currentMode", mode)
}

async function restoreCurrentMode(): Promise<string> {
  return this.getGlobalState("currentMode", "code") // Default to "code" mode
}
```

## Troubleshooting Custom Modes

### Common Issues and Solutions

1. **Mode Not Appearing**
   - Verify JSON syntax: Check for missing commas, quotes, or braces
   - Validate required fields: All required fields must be present
   - Check file location: `.roomodes` must be in workspace root

2. **File Access Denied**
   - Check regex pattern: Ensure pattern matches intended files
   - Use proper escaping: Regular expressions require double escaping (`\\`)
   - Verify mode selection: Confirm you're in the expected mode

3. **Custom Instructions Not Applied**
   - Format carefully: Follow Markdown formatting conventions
   - Check for conflicts: Mode-specific rules take precedence
   - Validate loading: Ensure mode is properly loaded

### Diagnostic Techniques

For diagnosing mode issues, you can add logging:

```typescript
// Add to mode validation function
console.log(`Validating mode: ${JSON.stringify(mode, null, 2)}`)
```

You can also create a diagnostic command:

```typescript
vscode.commands.registerCommand('roo-cline.diagnoseModes', async () => {
  const output = vscode.window.createOutputChannel('Roo Code Modes')
  
  output.appendLine('=== Roo Code Modes Diagnostic ===')
  
  // Get loaded modes
  const customModes = await loadCustomModes()
  
  output.appendLine(`\n== Custom Modes (${customModes.length}) ==`)
  for (const mode of customModes) {
    output.appendLine(`\nMode: ${mode.name} (${mode.slug})`)
    output.appendLine(`Role: ${mode.roleDefinition.substring(0, 100)}...`)
    output.appendLine('Groups:')
    for (const group of mode.groups) {
      if (typeof group === 'string') {
        output.appendLine(` - ${group}`)
      } else {
        output.appendLine(` - ${group[0]} (restricted to: ${group[1].fileRegex})`)
      }
    }
  }
  
  // Check for workspace modes file
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (workspacePath) {
    const roomodesPath = path.join(workspacePath, '.roomodes')
    const exists = await fileExists(roomodesPath)
    output.appendLine(`\n.roomodes file exists: ${exists}`)
    if (exists) {
      try {
        const content = await fs.readFile(roomodesPath, 'utf8')
        output.appendLine(`\n.roomodes content:\n${content}`)
      } catch (error) {
        output.appendLine(`Error reading .roomodes: ${error}`)
      }
    }
  }
  
  output.show()
})
```

## Best Practices

### 1. Specialized Roles

Define clear, specialized roles:

```
"roleDefinition": "You are Roo, a specialized database performance engineer who excels at query optimization, indexing strategies, and database tuning..."
```

Rather than:

```
"roleDefinition": "You are Roo, a database expert..."
```

### 2. Precise File Restrictions

Use specific regex patterns:

```
"fileRegex": "\\.(sql|ddl|dml)$"
```

Rather than:

```
"fileRegex": ".*"
```

### 3. Layered Permissions

Structure modes with appropriate permission levels:

```json
{
  "slug": "reviewer",
  "name": "Code Reviewer",
  "roleDefinition": "You are Roo, a code review specialist...",
  "groups": ["read", "command"]
}
```

### 4. Comprehensive Instructions

Provide detailed instructions with structure:

```
"customInstructions": "# Review Guidelines\n\n1. Security:\n   - Check for injection vulnerabilities\n   - Validate input sanitization\n\n2. Performance:\n   - Identify inefficient algorithms\n   - Check for proper resource management"
```

### 5. Mode Pairing

Pair modes with corresponding rule files:

```
.roomodes            # Custom mode definitions
.clinerules-analyst  # Rules specific to the "analyst" mode
```

## Advanced Integration Examples

### 1. Integrating with Custom System Prompts

For complete customization, pair a custom mode with a custom system prompt:

```json
// .roomodes
{
  "customModes": [
    {
      "slug": "medical-nlp",
      "name": "Medical NLP Specialist",
      "roleDefinition": "You are Roo, a specialized medical natural language processing expert...",
      "groups": ["read", ["edit", { "fileRegex": "\\.(py|ipynb|json|md)$", "description": "NLP and documentation files" }], "command"]
    }
  ]
}
```

```
// .roo/system-prompt-medical-nlp
You are Roo, a specialized medical natural language processing expert...

====

MEDICAL NLP FRAMEWORK

When analyzing medical texts:
1. Entity Recognition: Identify medical entities (diseases, medications, procedures)
2. Relation Extraction: Determine relationships between entities
3. Negation Detection: Identify negated statements
4. Temporal Analysis: Establish timeline of events

...
```

### 2. Creating Tool-specific Modes

Design modes for specific tools:

```json
{
  "slug": "terraform",
  "name": "Terraform Specialist",
  "roleDefinition": "You are Roo, a Terraform infrastructure specialist...",
  "groups": [
    "read",
    ["edit", { "fileRegex": "\\.(tf|tfvars|hcl)$", "description": "Terraform files only" }],
    "command"
  ],
  "customInstructions": "# Terraform Best Practices\n\n1. Use modules for reusable components\n2. Follow naming conventions: resource_type.resource_name\n3. Store state in a remote backend\n4. Use variables for all environment-specific values"
}
```

### 3. Workflow-oriented Modes

Create modes for specific development workflows:

```json
{
  "slug": "tdd",
  "name": "TDD Developer",
  "roleDefinition": "You are Roo, a test-driven development specialist who follows a strict red-green-refactor workflow...",
  "groups": ["read", "edit", "command"],
  "customInstructions": "# TDD Workflow\n\n1. Red: Always write a failing test first\n2. Green: Write the minimum code to make the test pass\n3. Refactor: Clean up the code while keeping tests green\n\nNever write implementation before tests."
}
```

## Conclusion

The custom modes system in Roo-Code provides a powerful framework for creating specialized AI assistants tailored to specific tasks, domains, or workflows. By understanding the technical implementation and following the best practices outlined in this guide, you can create sophisticated custom modes that enhance your development process.

Through the combination of precise role definitions, permission controls, and custom instructions, you can shape the AI's behavior to match your exact requirements, whether you're working on documentation, database optimization, security auditing, or any other specialized task.
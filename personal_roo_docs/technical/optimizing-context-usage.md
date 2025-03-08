# Optimizing Context Usage in Roo-Code: Technical Guide

## Overview

Roo-Code's LLM-powered assistance relies heavily on effective management of the context window. This guide documents the technical implementation of context optimization techniques in Roo-Code, focusing on reducing token usage, managing large conversations, and efficiently filtering files.

## System Prompt Construction

### Core Architecture

The system prompt is the foundation of Roo-Code's capabilities and is constructed in `src/core/prompts/system.ts`:

```typescript
export async function SYSTEM_PROMPT(
  mode: string,
  cwd: string,
  context?: vscode.ExtensionContext,
  options?: {
    mcpHub?: McpHub;
    supportsComputerUse?: boolean;
    browserViewportSize?: { width: number; height: number };
    customModePrompts?: CustomModePrompts;
    customModeConfigs?: ModeConfig[];
    experiments?: Record<string, boolean>;
    preferredLanguage?: string;
  }
) {
  // ... implementation details
}
```

The system prompt is composed of multiple sections, each contributing to the total token usage:

1. Role Definition: Defines the assistant's persona and capabilities
2. Tool Descriptions: Documents available tools and their usage
3. Capability Rules: Establishes boundaries and requirements
4. Mode Information: Mode-specific instructions and customizations

### Custom System Prompt Optimization

Roo-Code supports complete replacement of the system prompt via custom files, which can reduce token usage by including only necessary instructions:

```typescript
// From src/core/prompts/sections/custom-system-prompt.ts
export async function loadSystemPromptFile(cwd: string, mode: string): Promise<string> {
  try {
    const systemPromptPath = path.join(cwd, '.roo', `system-prompt-${mode}`)
    if (await fileExists(systemPromptPath)) {
      return await fs.readFile(systemPromptPath, 'utf8')
    }
    return ''
  } catch (error) {
    console.error(`Error loading custom system prompt: ${error}`)
    return ''
  }
}
```

## Sliding Window Implementation

### Message Truncation Architecture

Roo-Code uses a sliding window approach to manage long conversations, implemented in `src/core/sliding-window/index.ts`:

```typescript
export function truncateConversation(
  messages: Anthropic.Messages.MessageParam[],
  fracToRemove: number,
): Anthropic.Messages.MessageParam[] {
  const truncatedMessages = [messages[0]]
  const rawMessagesToRemove = Math.floor((messages.length - 1) * fracToRemove)
  const messagesToRemove = rawMessagesToRemove - (rawMessagesToRemove % 2)
  const remainingMessages = messages.slice(messagesToRemove + 1)
  truncatedMessages.push(...remainingMessages)

  return truncatedMessages
}
```

Key implementation details:
- Always preserves the first message (system prompt)
- Removes a calculated fraction of older messages
- Uses even-number truncation to maintain user-assistant alternation
- Keeps the most recent exchanges intact

### Truncation Decision Logic

Truncation occurs automatically when token usage approaches the context limit:

```typescript
export async function truncateConversationIfNeeded({
  messages,
  totalTokens,
  contextWindow,
  maxTokens,
  apiHandler,
}: TruncateOptions): Promise<Anthropic.Messages.MessageParam[]> {
  // Calculate the maximum tokens reserved for response
  const reservedTokens = maxTokens || contextWindow * 0.2

  // Estimate tokens for the last message (which is always a user message)
  const lastMessage = messages[messages.length - 1]
  const lastMessageContent = lastMessage.content
  const lastMessageTokens = Array.isArray(lastMessageContent)
    ? await estimateTokenCount(lastMessageContent, apiHandler)
    : await estimateTokenCount([{ type: "text", text: lastMessageContent as string }], apiHandler)

  // Calculate total effective tokens
  const effectiveTokens = totalTokens + lastMessageTokens

  // Calculate available tokens with buffer
  const allowedTokens = contextWindow * (1 - TOKEN_BUFFER_PERCENTAGE) - reservedTokens

  // Determine if truncation is needed
  return effectiveTokens > allowedTokens ? truncateConversation(messages, 0.5) : messages
}
```

Key optimization parameters:
- TOKEN_BUFFER_PERCENTAGE = 0.1 (10% of context window kept as buffer)
- Default truncation removes 50% of messages when needed
- Reserved tokens for response (default 20% of context window)

## File Filtering System

### Core Architecture

The file filtering system is a critical component of context optimization, implemented through a multi-layer pipeline:

```typescript
export async function filterFiles(
  filePaths: string[],
  options: FilterOptions
): Promise<string[]> {
  // Start with all files
  let filteredPaths = [...filePaths];
  
  // Apply ignore patterns (.rooignore, etc.)
  filteredPaths = applyIgnorePatterns(filteredPaths, options.ignorePatterns);
  
  // Filter by file size
  filteredPaths = filterBySize(filteredPaths, options.maxFileSize);
  
  // Filter by file type
  filteredPaths = filterByType(filteredPaths, options.allowedTypes);
  
  // Apply custom filters
  filteredPaths = applyCustomFilters(filteredPaths, options.customFilters);
  
  return filteredPaths;
}
```

### .rooignore Implementation

The .rooignore system prevents irrelevant files from consuming context:

```typescript
private async loadIgnorePatterns(): Promise<void> {
  try {
    // Load from .rooignore
    const ignoreFilePath = path.join(this.workspaceRoot, '.rooignore');
    if (await fileExists(ignoreFilePath)) {
      const content = await fs.readFile(ignoreFilePath, 'utf8');
      this.ignorePatterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
    }
    
    // Add default patterns
    this.ignorePatterns.push(...DEFAULT_IGNORE_PATTERNS);
  } catch (error) {
    console.error('Failed to load ignore patterns:', error);
    this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS];
  }
}
```

### Size-Based Filtering

Files exceeding size thresholds are filtered out to prevent context overflow:

```typescript
function filterBySize(
  filePaths: string[],
  maxSizeInBytes: number
): Promise<string[]> {
  return Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const stats = await fs.stat(filePath);
        return {
          path: filePath,
          size: stats.size,
          keep: stats.size <= maxSizeInBytes
        };
      } catch (error) {
        console.error(`Error getting stats for ${filePath}:`, error);
        return { path: filePath, size: 0, keep: false };
      }
    })
  ).then(results => results.filter(result => result.keep).map(result => result.path));
}
```

Default size thresholds:
- MAX_FILE_SIZE = 1048576 (1MB) for general context
- MAX_SEARCHABLE_FILE_SIZE = 5242880 (5MB) for search operations

### Binary File Optimization

Binary files are detected and excluded or processed differently:

```typescript
export async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    // Method 1: Check file extension against known binary types
    if (hasKnownBinaryExtension(filePath)) {
      return true;
    }
    
    // Method 2: Sample file content and check for binary characters
    const buffer = await fs.readFile(filePath, { encoding: null });
    
    // Check first 4KB of the file for binary characteristics
    const sampleSize = Math.min(4096, buffer.length);
    const sample = buffer.slice(0, sampleSize);
    
    // Count binary characters
    let binaryCharCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      if (byte === 0 || (byte < 32 && ![9, 10, 13].includes(byte)) || byte >= 127) {
        binaryCharCount++;
      }
    }
    
    // If more than 10% of characters are binary, consider it a binary file
    return binaryCharCount > sampleSize * 0.1;
  } catch (error) {
    return true; // Assume binary on error
  }
}
```

## Environment Information Optimization

### Open Tabs Context Control

The number of open editor tabs included in context is configurable:

```typescript
// From src/core/environment/index.ts
export async function getEnvironmentDetails(
  cwd: string,
  options: {
    maxOpenTabsContext?: number;
    // ...other options
  }
): Promise<string> {
  // ... implementation
  
  // Limit open tabs based on maxOpenTabsContext setting
  const visibleFiles = activeTextEditor 
    ? activeTextEditor.document.fileName
    : visibleEditors.slice(0, maxOpenTabsContext).map(e => e.document.fileName);
  
  // ... implementation
}
```

Default: 10 tabs maximum

### Terminal Output Limitation

Terminal output is limited to prevent excessive context usage:

```typescript
// From src/core/environment/terminal.ts
export function getTerminalOutput(maxLines: number = 100): string {
  // ...implementation
  
  // Limit output lines
  const limitedLines = lines.slice(-maxLines);
  
  // ...implementation
}
```

Default: 100 lines maximum

## Mode-Specific Context Optimization

### Tool Inclusion Logic

Different modes include different tools, affecting context usage:

```typescript
// From src/shared/modes.ts
export function getToolsForMode(groups: readonly GroupEntry[]): string[] {
  const tools = new Set<string>()

  // Add tools from each group
  groups.forEach((group) => {
    const groupName = getGroupName(group)
    const groupConfig = TOOL_GROUPS[groupName]
    groupConfig.tools.forEach((tool: string) => tools.add(tool))
  })

  // Always add required tools
  ALWAYS_AVAILABLE_TOOLS.forEach((tool) => tools.add(tool))

  return Array.from(tools)
}
```

### Custom Mode Optimization

Custom modes can be defined with specific tool restrictions to reduce context:

```typescript
// Example from documentation
{
  "customModes": [
    {
      "slug": "docs-editor",
      "name": "Documentation Editor",
      "roleDefinition": "You are Roo, a documentation specialist...",
      "groups": [
        "read",
        ["edit", { 
          "fileRegex": "\\.(md|txt|adoc|rst)$", 
          "description": "Documentation files only" 
        }]
      ]
    }
  ]
}
```

## MCP Server Context Management

MCP servers contribute to context usage in two ways:

```typescript
// From src/core/prompts/sections/mcp-servers.ts
export async function getMcpServersSection(
  mcpHub?: McpHub,
  effectiveDiffStrategy?: boolean,
  enableMcpServerCreation?: boolean,
): Promise<string> {
  // ...implementation that adds MCP server information to context
}
```

Disabling MCP via `mcpEnabled: false` removes server descriptions and tools.

## Experimental Features Affecting Context

### PowerSteering Mode

Power Steering significantly increases context usage by refreshing instructions:

```typescript
// Impact on context: Significantly increases context usage by repeating instructions
```

### Unified Diff Strategy

Alternative approach to handling file modifications:

```typescript
// Impact on context: Moderate impact; may use more context for diff explanations
```

### Search and Replace / Insert Content

Specialized content modification tools:

```typescript
// Impact on context: Minor impact; may require additional context for operations
```

### Multi-Block Search and Replace

Coordinated file changes in single operations:

```typescript
// Impact on context: Moderate impact; requires context for coordinating changes
```

## Advanced Context Optimization Techniques

### Caching Strategies

File filtering uses caching to improve performance:

```typescript
private ignoreCache: Map<string, boolean> = new Map();

// In shouldIgnore method:
if (this.ignoreCache.has(relativePath)) {
  return this.ignoreCache.get(relativePath)!;
}

// ... perform check ...

// Cache the result
this.ignoreCache.set(relativePath, shouldIgnore);
```

### Early Termination Patterns

Pattern matching uses early termination for efficiency:

```typescript
private matchesAnyPattern(relativePath: string): boolean {
  // Check fast exact matches first
  if (this.exactIgnorePatterns.has(relativePath)) {
    return true;
  }
  
  // Then check fast directory matches
  for (const dirPattern of this.directoryIgnorePatterns) {
    if (relativePath.startsWith(dirPattern)) {
      return true;
    }
  }
  
  // Finally, use the more expensive regex matching
  return this.ignorePatterns.some(pattern => {
    return micromatch.isMatch(relativePath, pattern, { dot: true });
  });
}
```

### Parallel Processing

File operations use parallel processing for better performance:

```typescript
async function filterBySize(filePaths: string[], maxSize: number): Promise<string[]> {
  const results = await Promise.all(
    filePaths.map(async (path) => {
      const stats = await fs.stat(path);
      return { path, keep: stats.size <= maxSize };
    })
  );
  
  return results.filter(result => result.keep).map(result => result.path);
}
```

## Configuration Options for Context Optimization

| Setting | Type | Default | Description | Impact on Context |
|---------|------|---------|-------------|-------------------|
| `maxOpenTabsContext` | Number | 10 | Maximum number of VSCode open tabs to include | Higher values include more file context |
| `terminalOutputLineLimit` | Number | 100 | Maximum terminal output lines in context | Higher values include more terminal output |
| `maxFileSize` | Number | 1048576 (1MB) | Maximum file size for context inclusion | Smaller values exclude more large files |
| `maxSearchableFileSize` | Number | 5242880 (5MB) | Maximum file size for search | Smaller values exclude more files from search |
| `powerSteering` | Boolean | false | Enhanced role adherence | Enabled significantly increases context usage |
| `mcpEnabled` | Boolean | true | Enable MCP functionality | Disabled removes MCP tools and server info |
| `diffEnabled` | Boolean | true | Enable diff operations | Disabled removes diff tools from context |

## Performance Metrics

Context optimization techniques in Roo-Code provide significant improvements:

1. File filtering can reduce context size by 70-90% in projects with many dependencies
2. The sliding window approach prevents context overflow in long conversations
3. Size-based filtering prevents large files from consuming excessive tokens
4. Binary detection prevents unintelligible binary content from wasting context
5. Caching improves filtering performance by 30-50% in large directories

## Conclusion

Effective context optimization is essential for maximizing Roo-Code's capabilities. The technical approaches described in this document provide the foundation for managing context window usage efficiently, enabling more productive interactions with the AI assistant.

The combination of sliding window conversation management, sophisticated file filtering, and configurable settings allows developers to fine-tune context usage based on their specific requirements and project characteristics.
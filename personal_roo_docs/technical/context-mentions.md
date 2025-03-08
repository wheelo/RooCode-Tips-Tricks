# Context Mentions in Roo-Code: Technical Guide

## Overview

The context mention system in Roo-Code provides a powerful mechanism for referencing resources directly in conversations. This technical guide explores the implementation details, usage patterns, and advanced capabilities of the mention system.

## Core Implementation

### Mention Regular Expression

The cornerstone of the mention system is a sophisticated regular expression pattern defined in `src/shared/context-mentions.ts`:

```typescript
const mentionPatterns = [
  // Unix paths with escaped spaces using backslash
  "(?:\\/|^)(?:[^\\/\\s\\\\]|\\\\[ \\t])+(?:\\/(?:[^\\/\\s\\\\]|\\\\[ \\t])+)*\\/?",
  // Windows paths with drive letters (C:\path) with support for escaped spaces
  "[A-Za-z]:\\\\(?:(?:[^\\\\\\s/]+|\\/[ ])+(?:\\\\(?:[^\\\\\\s/]+|\\/[ ])+)*)?",
  // Windows relative paths (folder\file or .\folder\file) with support for escaped spaces
  "(?:\\.{0,2}|[^\\\\\\s/]+)\\\\(?:[^\\\\\\s/]+|\\\\[ \\t]|\\/[ ])+(?:\\\\(?:[^\\\\\\s/]+|\\\\[ \\t]|\\/[ ])+)*\\\\?",
  // Windows network shares (\\server\share) with support for escaped spaces
  "\\\\\\\\[^\\\\\\s]+(?:\\\\(?:[^\\\\\\s/]+|\\/[ ])+)*(?:\\\\)?",
  // URLs with protocols (http://, https://, etc.)
  "\\w+:\/\/[^\\s]+",
  // Git hashes (7-40 alphanumeric characters)
  "[a-zA-Z0-9]{7,40}\\b",
  // Special keywords
  "problems\\b",
  "git-changes\\b",
  "terminal\\b",
]
// Build the full regex pattern by joining the patterns with OR operator
const mentionRegexPattern = `@(${mentionPatterns.join("|")})(?=[.,;:!?]?(?=[\\s\\r\\n]|$))`
export const mentionRegex = new RegExp(mentionRegexPattern)
export const mentionRegexGlobal = new RegExp(mentionRegexPattern, "g")
```

This pattern is designed to match several types of mentions with advanced support for various path formats:

1. **Unix/Linux Paths**: Starting with `/` and supporting escaped spaces
2. **Windows Paths**: Supporting drive letters, relative paths, and network shares with escaped spaces
3. **URL Mentions**: Following the format `protocol://path`
4. **Git Commit Hashes**: 7-40 alphanumeric characters
5. **Special Keywords**: `problems`, `git-changes`, `terminal`

The pattern also includes a sophisticated lookahead to ensure punctuation following a mention isn't included in the match.

### Regex Component Breakdown

The regex is built from multiple patterns to handle various operating systems and path formats:

```
// Complete regex pattern breakdown
/@(                           # Start with @ symbol and begin capturing group
  (?:\/|^)                    # Unix path: Starts with slash or beginning of line
    (?:[^\/\s\\]|\\[ \t])+    # Path segment with support for escaped spaces
    (?:\/(?:[^\/\s\\]|\\[ \t])+)*  # Additional path segments
    \/?                       # Optional trailing slash
  |
  [A-Za-z]:\\                 # Windows drive path: Drive letter followed by :\
    (?:(?:[^\\s/]+|\/[ ])+    # Path segment with spaces escaped with forward slash
    (?:\\(?:[^\\s/]+|\/[ ])+)*)?  # Additional path segments
  |
  (?:\.{0,2}|[^\\s/]+)\\      # Windows relative path: Starting with ., .., or folder name
    (?:[^\\s/]+|\\[ \t]|\/[ ])+ # Path segment with various space escaping methods
    (?:\\(?:[^\\s/]+|\\[ \t]|\/[ ])+)*  # Additional path segments
    \\?                       # Optional trailing backslash
  |
  \\\\[^\\s]+                 # Windows network share: \\server
    (?:\\(?:[^\\s/]+|\/[ ])+)*  # Share and additional path components
    (?:\\)?                   # Optional trailing backslash
  |
  \w+:\/\/[^\s]+              # URL: protocol:// followed by content
  |
  [a-zA-Z0-9]{7,40}\b         # Git hash: 7-40 alphanumeric characters
  |
  problems\b                  # Keyword: problems
  |
  git-changes\b               # Keyword: git-changes
  |
  terminal\b                  # Keyword: terminal
)                             # End capturing group
(?=                           # Positive lookahead for termination
  [.,;:!?]?                   # Optional punctuation
  (?=[\s\r\n]|$)              # Followed by whitespace or end of string
)
```

This sophisticated pattern ensures paths are correctly matched across operating systems, handles escaped spaces in different formats, and includes advanced features like network shares and relative paths.

### Mention Types and Data Structures

Mentions are represented as structured objects:

```typescript
export interface MentionSuggestion {
  type: "file" | "folder" | "git" | "problems"
  label: string
  description?: string
  value: string
  icon?: string
}
```

Git mentions include additional metadata:

```typescript
export interface GitMentionSuggestion extends MentionSuggestion {
  type: "git"
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
}
```

## Mention Processing Pipeline

### 1. Detection Phase

When a message is sent to Roo-Code, the system scans for mentions using the `mentionRegexGlobal` pattern:

```typescript
// Simplified detection logic
function detectMentions(message: string): string[] {
  const matches = message.match(mentionRegexGlobal) || []
  return matches.map(match => match.substring(1)) // Remove @ prefix
}
```

### 2. Resolution Phase

Each detected mention is resolved to its actual content:

```typescript
// Simplified resolution logic
async function resolveMentions(mentions: string[]): Promise<ResolvedMention[]> {
  const resolved = []
  
  for (const mention of mentions) {
    if (mention.startsWith('/')) {
      // Resolve file/folder
      const content = await resolveFileMention(mention)
      resolved.push({ type: 'file', mention, content })
    } else if (mention.match(/^\w+:\/\//)) {
      // Resolve URL
      const content = await resolveUrlMention(mention)
      resolved.push({ type: 'url', mention, content })
    } else if (mention.match(/^[a-f0-9]{7,40}$/)) {
      // Resolve git hash
      const content = await resolveGitMention(mention)
      resolved.push({ type: 'git', mention, content })
    } else if (mention === 'problems') {
      // Resolve problems
      const content = await resolveProblems()
      resolved.push({ type: 'problems', mention, content })
    } else if (mention === 'git-changes') {
      // Resolve git changes
      const content = await resolveGitChanges()
      resolved.push({ type: 'git-changes', mention, content })
    } else if (mention === 'terminal') {
      // Resolve terminal output
      const content = await resolveTerminal()
      resolved.push({ type: 'terminal', mention, content })
    }
  }
  
  return resolved
}
```

### 3. Context Integration Phase

Resolved mentions are integrated into the conversation context:

```typescript
// Simplified context integration
function integrateIntoContext(userMessage: string, resolvedMentions: ResolvedMention[]): string {
  let contextWithMentions = userMessage
  
  // Add resolved mentions to context
  for (const mention of resolvedMentions) {
    contextWithMentions += `\n\n--- ${mention.type.toUpperCase()} MENTION: ${mention.mention} ---\n${mention.content}\n`
  }
  
  return contextWithMentions
}
```

## Detailed Mention Types

### File and Folder Mentions

File mentions provide access to file contents, while folder mentions list directory structures.

**Implementation details:**

```typescript
async function resolveFileMention(path: string): Promise<string> {
  // Normalize path
  const normalizedPath = normalizePath(path)
  
  // Check if path exists
  const exists = await fileExists(normalizedPath)
  if (!exists) {
    return `File not found: ${normalizedPath}`
  }
  
  // Check if it's a directory
  const isDirectory = await isDir(normalizedPath)
  if (isDirectory) {
    // List directory contents
    const contents = await listDirectoryContents(normalizedPath)
    return `Directory contents:\n${contents.join('\n')}`
  }
  
  // Check file size
  const stats = await fs.stat(normalizedPath)
  if (stats.size > MAX_FILE_SIZE) {
    return `File too large to include (${formatSize(stats.size)}). Please use a more specific mention.`
  }
  
  // Read file content
  const content = await fs.readFile(normalizedPath, 'utf-8')
  return content
}
```

### Git Mentions

Git mentions provide access to commit details and changes.

**Implementation details:**

```typescript
async function resolveGitMention(hash: string): Promise<string> {
  try {
    // Get commit details
    const git = simpleGit(workspaceRoot)
    const commit = await git.show(['--format=%H%n%h%n%s%n%an%n%ad', hash])
    
    // Parse commit info
    const [fullHash, shortHash, subject, author, date, ...diff] = commit.split('\n')
    
    // Format commit details
    return `Commit: ${shortHash} (${fullHash})\nAuthor: ${author}\nDate: ${date}\nSubject: ${subject}\n\nChanges:\n${diff.join('\n')}`
  } catch (error) {
    return `Error resolving git commit: ${error.message}`
  }
}

async function resolveGitChanges(): Promise<string> {
  try {
    // Get uncommitted changes
    const git = simpleGit(workspaceRoot)
    const diff = await git.diff()
    
    if (!diff) {
      return "No uncommitted changes found"
    }
    
    return diff
  } catch (error) {
    return `Error resolving git changes: ${error.message}`
  }
}
```

### Problems Mention

Problems mentions provide access to current workspace problems (errors, warnings, etc.).

**Implementation details:**

```typescript
async function resolveProblems(): Promise<string> {
  // Get all diagnostics from workspace
  const allDiagnostics = vscode.languages.getDiagnostics()
  
  if (allDiagnostics.length === 0) {
    return "No problems found in workspace"
  }
  
  let problemsText = ""
  
  // Format each problem
  for (const [uri, diagnostics] of allDiagnostics) {
    if (diagnostics.length === 0) continue
    
    const filePath = vscode.workspace.asRelativePath(uri)
    problemsText += `File: ${filePath}\n`
    
    for (const diagnostic of diagnostics) {
      const severity = getSeverityText(diagnostic.severity)
      const line = diagnostic.range.start.line + 1
      const column = diagnostic.range.start.character + 1
      problemsText += `  ${severity} (${line}:${column}): ${diagnostic.message}\n`
    }
    
    problemsText += '\n'
  }
  
  return problemsText.trim()
}
```

### Terminal Mention

Terminal mentions provide access to recent terminal output.

**Implementation details:**

```typescript
async function resolveTerminal(): Promise<string> {
  const activeTerminal = vscode.window.activeTerminal
  
  if (!activeTerminal) {
    return "No active terminal found"
  }
  
  // Get terminal content from the terminal manager
  const content = terminalManager.getTerminalContent(activeTerminal.name)
  
  if (!content) {
    return "No content available for the active terminal"
  }
  
  // Limit to most recent output
  const lines = content.split('\n')
  const recentLines = lines.slice(Math.max(0, lines.length - MAX_TERMINAL_LINES))
  
  return recentLines.join('\n')
}
```

## Implementation of Git Mention Suggestions

Git mentions include rich metadata through the `GitMentionSuggestion` interface. The `formatGitSuggestion` function creates properly formatted git suggestions:

```typescript
export function formatGitSuggestion(commit: {
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
}): GitMentionSuggestion {
  return {
    type: "git",
    label: commit.subject,
    description: `${commit.shortHash} by ${commit.author} on ${commit.date}`,
    value: commit.hash,
    icon: "$(git-commit)", // VSCode git commit icon
    hash: commit.hash,
    shortHash: commit.shortHash,
    subject: commit.subject,
    author: commit.author,
    date: commit.date,
  }
}
```

This formatting is used in the UI to display rich commit information when suggesting git mentions.

## Advanced Usage Patterns

### 1. Multi-Resource References

Multiple mentions can be combined to provide comprehensive context:

```
Can you explain the relationship between @/src/utils/parser.js and @/src/components/DataTable.js?
```

The system resolves both file mentions and provides context for comparing them.

### 2. Targeted Problem Resolution

Problems can be referenced alongside code:

```
I'm trying to fix the error in @/src/api/client.js. Can you help me understand what @problems is showing?
```

This pattern combines file context with error diagnostics for more effective problem-solving.

### 3. Code Review Pattern

Git changes can be referenced for code review:

```
Can you review @git-changes and check for any security issues or performance problems?
```

The system includes the current git diff in the context for analysis.

### 4. Historical Analysis

Git commit history can be explored with commit hashes:

```
What changes were introduced in @a1b2c3d and how do they affect the authentication system?
```

This references a specific commit by its hash for historical analysis.

### 5. Terminal Debugging

Terminal output can be analyzed:

```
I'm seeing this error in @terminal. What's causing it and how can I fix it?
```

This includes recent terminal output in the conversation context.

## Technical Implementation Details

### Mention Detection and Extraction

The detection logic is governed by the regular expression, but the extraction and processing involves more sophisticated logic:

```typescript
function extractMentions(text: string): MentionMatch[] {
  const mentions: MentionMatch[] = []
  let match
  
  // Use global regex to find all mentions
  while ((match = mentionRegexGlobal.exec(text)) !== null) {
    const fullMatch = match[0]
    const mention = match[1]
    const startIndex = match.index
    const endIndex = startIndex + fullMatch.length
    
    // Determine mention type
    let type: MentionType
    if (mention.startsWith('/')) {
      type = 'file_or_folder'
    } else if (mention.match(/^\w+:\/\//)) {
      type = 'url'
    } else if (mention.match(/^[a-f0-9]{7,40}$/)) {
      type = 'git'
    } else if (mention === 'problems') {
      type = 'problems'
    } else if (mention === 'git-changes') {
      type = 'git_changes'
    } else if (mention === 'terminal') {
      type = 'terminal'
    } else {
      type = 'unknown'
    }
    
    mentions.push({
      mention,
      type,
      startIndex,
      endIndex
    })
  }
  
  return mentions
}
```

### Context Size Management

When including mentioned content in the context, the system must manage context window limitations:

```typescript
function optimizeContextSize(mentions: ResolvedMention[], maxTokens: number): ResolvedMention[] {
  // Estimate tokens for each mention
  const mentionsWithTokens = mentions.map(mention => ({
    ...mention,
    estimatedTokens: estimateTokens(mention.content)
  }))
  
  // Sort by priority (files first, then git, then others)
  mentionsWithTokens.sort((a, b) => {
    // Custom priority logic
    // ...
  })
  
  // Fit mentions within token limit
  let usedTokens = 0
  const optimizedMentions = []
  
  for (const mention of mentionsWithTokens) {
    if (usedTokens + mention.estimatedTokens <= maxTokens) {
      optimizedMentions.push(mention)
      usedTokens += mention.estimatedTokens
    } else {
      // For large mentions, truncate instead of excluding
      if (mention.type === 'file' || mention.type === 'git') {
        const truncated = truncateContent(mention.content, maxTokens - usedTokens)
        optimizedMentions.push({
          ...mention,
          content: truncated,
          truncated: true
        })
        break
      }
    }
  }
  
  return optimizedMentions
}
```

### Mention Suggestions Implementation

The system provides intelligent suggestions for mentions:

```typescript
async function suggestMentions(inputText: string, cursorPosition: number): Promise<MentionSuggestion[]> {
  // Extract partial mention at cursor position
  const partialMention = extractPartialMentionAtCursor(inputText, cursorPosition)
  if (!partialMention) return []
  
  if (partialMention.startsWith('/')) {
    // Suggest files and folders
    return suggestFilesAndFolders(partialMention)
  } else if (partialMention.match(/^[a-f0-9]{1,39}$/)) {
    // Suggest git commits
    return suggestGitCommits(partialMention)
  } else {
    // Suggest keywords (problems, git-changes, terminal)
    return suggestKeywords(partialMention)
  }
}

async function suggestFilesAndFolders(partial: string): Promise<MentionSuggestion[]> {
  // Implementation details for file/folder suggestions
  // ...
}

async function suggestGitCommits(partial: string): Promise<GitMentionSuggestion[]> {
  // Implementation details for git commit suggestions
  // ...
}

function suggestKeywords(partial: string): MentionSuggestion[] {
  const keywords = ['problems', 'git-changes', 'terminal']
  const matching = keywords.filter(k => k.startsWith(partial))
  
  return matching.map(keyword => ({
    type: keyword === 'problems' ? 'problems' : 'git',
    label: keyword,
    value: keyword,
    icon: getIconForKeyword(keyword)
  }))
}
```

## Performance Considerations

### 1. File Size Limitations

For file mentions, the system imposes size limits:

```typescript
const MAX_FILE_SIZE = 1024 * 1024 // 1MB

async function resolveFileMention(path: string): Promise<string> {
  // ...
  const stats = await fs.stat(normalizedPath)
  if (stats.size > MAX_FILE_SIZE) {
    return `File too large to include (${formatSize(stats.size)}). Please use a more specific mention.`
  }
  // ...
}
```

### 2. Binary File Handling

The system detects and handles binary files appropriately:

```typescript
async function resolveFileMention(path: string): Promise<string> {
  // ...
  if (await isBinaryFile(normalizedPath)) {
    return `Cannot include binary file content (${normalizedPath}). Please use a text file.`
  }
  // ...
}
```

### 3. Optimized Git Operations

Git operations are optimized to minimize resource usage:

```typescript
async function resolveGitMention(hash: string): Promise<string> {
  // ...
  // Use specific git options to limit output size
  const commit = await git.show([
    '--format=%H%n%h%n%s%n%an%n%ad',
    '--stat',
    '-p',
    '--max-count=1',
    hash
  ])
  // ...
}
```

### 4. Pagination for Large Output

For large outputs, the system implements pagination:

```typescript
async function resolveProblemsWithPagination(page = 1, pageSize = 50): Promise<string> {
  const allDiagnostics = vscode.languages.getDiagnostics()
  
  // Flatten and convert to array for pagination
  const allProblems = []
  for (const [uri, diagnostics] of allDiagnostics) {
    for (const diagnostic of diagnostics) {
      allProblems.push({
        uri,
        diagnostic
      })
    }
  }
  
  // Paginate
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pagedProblems = allProblems.slice(start, end)
  
  // Format output
  // ...
  
  return `Problems (page ${page}/${Math.ceil(allProblems.length / pageSize)}):\n${formattedProblems}`
}
```

## Testing and Debugging Mentions

### Unit Testing Regex Patterns

The mention regex can be tested systematically:

```typescript
describe('Mention Regex', () => {
  test('matches file paths', () => {
    const cases = [
      '@/path/to/file.js',
      '@/src/index.ts',
      '@/README.md',
      '@/path/with-dashes/file.txt',
      '@/path/with spaces/file.txt'
    ]
    
    for (const testCase of cases) {
      expect(testCase.match(mentionRegex)).not.toBeNull()
    }
  })
  
  test('matches URLs', () => {
    const cases = [
      '@http://example.com',
      '@https://api.github.com/repos/user/repo',
      '@file:///home/user/document.pdf'
    ]
    
    for (const testCase of cases) {
      expect(testCase.match(mentionRegex)).not.toBeNull()
    }
  })
  
  // More tests for git hashes, keywords, etc.
})
```

### Edge Case Handling

The mention system handles various edge cases:

1. **Invalid Git Hashes**: Presents user-friendly error messages
2. **Non-Existent Files**: Reports that files don't exist rather than failing silently
3. **Concurrent Mentions**: Processes multiple mentions in parallel
4. **Circular References**: Detects and prevents infinite loops

### Debugging Tools

For advanced debugging, the system provides diagnostic commands:

```typescript
// Register diagnostic command
vscode.commands.registerCommand('roo-cline.debugMention', async () => {
  const mention = await vscode.window.showInputBox({
    prompt: 'Enter mention to debug (include @ symbol)',
    placeHolder: '@/path/to/file.js'
  })
  
  if (!mention) return
  
  try {
    // Parse the mention
    const match = mention.match(mentionRegex)
    if (!match) {
      vscode.window.showInformationMessage(`Not a valid mention: ${mention}`)
      return
    }
    
    // Resolve mention
    const mentionValue = match[1]
    const resolved = await resolveMention(mentionValue)
    
    // Show diagnostic info
    const output = vscode.window.createOutputChannel('Mention Debug')
    output.appendLine(`----- Mention Debug: ${mention} -----`)
    output.appendLine(`Type: ${resolved.type}`)
    output.appendLine(`Value: ${mentionValue}`)
    output.appendLine(`Resolution Time: ${resolved.resolutionTime}ms`)
    output.appendLine(`Content Length: ${resolved.content.length} characters`)
    output.appendLine(`Estimated Tokens: ${estimateTokens(resolved.content)}`)
    output.appendLine('\nContent Preview:')
    output.appendLine(resolved.content.substring(0, 500) + '...')
    output.show()
  } catch (error) {
    vscode.window.showErrorMessage(`Error debugging mention: ${error.message}`)
  }
})
```

## Extending the Mention System

### Creating Custom Mention Types

The mention system can be extended with custom mention types:

```typescript
// Create a custom mention resolver
function registerCustomMentionResolver(prefix: string, resolver: MentionResolver) {
  customMentionResolvers.set(prefix, resolver)
}

// Add a custom mention type for API endpoints
registerCustomMentionResolver('api', async (value) => {
  const endpoint = value.replace('api:', '')
  const apiBaseUrl = vscode.workspace.getConfiguration('myExtension').get('apiBaseUrl')
  
  try {
    const response = await fetch(`${apiBaseUrl}/${endpoint}`)
    const data = await response.json()
    return {
      type: 'api',
      content: JSON.stringify(data, null, 2),
      metadata: {
        endpoint,
        statusCode: response.status
      }
    }
  } catch (error) {
    return {
      type: 'api',
      content: `Error accessing API endpoint: ${error.message}`,
      error: true
    }
  }
})
```

### Adding Custom Formatters

The way mentions are displayed can be customized:

```typescript
function registerMentionFormatter(type: string, formatter: MentionFormatter) {
  mentionFormatters.set(type, formatter)
}

// Add a custom formatter for API mentions
registerMentionFormatter('api', (mention, content) => {
  try {
    const data = JSON.parse(content)
    return `API Response: ${mention}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
  } catch {
    return `API Response: ${mention}\n\n${content}`
  }
})
```

## Best Practices for Using Mentions

### 1. File Reference Best Practices

- Use specific file paths rather than directories for targeted context
- Reference only the files needed for the current task
- Use relative paths from the workspace root for portability

### 2. Git Reference Best Practices

- Use short commit hashes (7-8 characters) for better readability
- Reference recent commits to ensure they exist in the local repository
- Combine `@git-changes` with specific file mentions for focused reviews

### 3. Problems and Terminal Best Practices

- Use `@problems` when addressing specific errors or warnings
- Use `@terminal` immediately after seeing relevant output
- Combine with file mentions to provide complete context

### 4. Performance Optimization

- Reference smaller files when possible
- Use targeted mentions rather than broad directory references
- Limit the number of mentions in a single message to preserve context space

## Conclusion

The context mention system in Roo-Code provides a sophisticated mechanism for integrating various resources directly into conversations. Through its carefully designed regex pattern matching, structured type system, and flexible resolution process, it enhances the AI's ability to understand and work with your project's code, history, and state.

By understanding the technical implementation and best practices outlined in this guide, you can more effectively use mentions to provide rich context for your interactions with Roo-Code.
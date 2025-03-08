# .rooignore Configuration in Roo-Code: Technical Guide

## Overview

The `.rooignore` configuration system in Roo-Code provides developers with granular control over which files and directories are excluded from AI processing, analysis, and operations. This technical guide explores the implementation details, pattern syntax, and advanced usage of the `.rooignore` feature.

## Core Functionality

The `.rooignore` system works similarly to `.gitignore`, allowing developers to specify patterns that match files and directories that should be ignored by Roo-Code's LLM processing engine. This is particularly useful for:

1. **Performance Optimization**: Excluding large files or directories that would unnecessarily consume tokens
2. **Privacy Protection**: Preventing sensitive files from being analyzed
3. **Focus Control**: Limiting the AI's attention to relevant parts of a project
4. **System File Exclusion**: Preventing system files, temporary files, and build artifacts from entering the context

## Implementation Architecture

```typescript
// Core implementation in FileSystemService
export class FileSystemService {
  private ignorePatterns: string[] = []
  private ignoreCache: Map<string, boolean> = new Map()
  
  constructor(private workspaceRoot: string) {
    this.loadIgnorePatterns()
  }
  
  private async loadIgnorePatterns(): Promise<void> {
    try {
      // Check for .rooignore file in workspace root
      const ignoreFilePath = path.join(this.workspaceRoot, '.rooignore')
      if (await fileExists(ignoreFilePath)) {
        const content = await fs.readFile(ignoreFilePath, 'utf8')
        this.ignorePatterns = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'))
      }
      
      // Add default ignore patterns
      this.ignorePatterns.push(...DEFAULT_IGNORE_PATTERNS)
    } catch (error) {
      console.error('Failed to load .rooignore patterns:', error)
      // Fall back to default patterns
      this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS]
    }
  }
  
  // Check if a file should be ignored
  public shouldIgnore(filePath: string): boolean {
    // Normalize path for consistent matching
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/')
    const relativePath = path.relative(this.workspaceRoot, normalizedPath)
    
    // Check cache first
    if (this.ignoreCache.has(relativePath)) {
      return this.ignoreCache.get(relativePath)!
    }
    
    // Check against patterns
    const shouldIgnore = this.matchesAnyPattern(relativePath)
    
    // Cache the result
    this.ignoreCache.set(relativePath, shouldIgnore)
    
    return shouldIgnore
  }
  
  private matchesAnyPattern(relativePath: string): boolean {
    return this.ignorePatterns.some(pattern => {
      return micromatch.isMatch(relativePath, pattern, { dot: true })
    })
  }
}
```

## Pattern Syntax

The `.rooignore` file supports a variety of pattern formats:

### Basic Patterns

```
# Ignore specific files
secret.json
credentials.yaml
.env

# Ignore specific directories
node_modules/
build/
dist/

# Ignore all files with specific extension
*.log
*.tmp
```

### Negation Patterns (Exceptions)

You can use negation patterns to exclude files from being ignored:

```
# Ignore all .log files
*.log

# But don't ignore important.log
!important.log
```

### Path-Specific Patterns

```
# Ignore a specific file in a specific directory
src/secrets/config.json

# Ignore all .env files in any directory
**/.env

# Ignore all .txt files in the docs directory and its subdirectories
docs/**/*.txt
```

### Pattern Matching Rules

1. **Blank lines** are ignored
2. **Lines starting with #** are treated as comments
3. **Trailing spaces** are ignored unless escaped with a backslash
4. **Leading slash** matches the beginning of the path relative to the workspace root
5. **Trailing slash** indicates a directory (and all its contents)
6. **Double asterisk** (`**`) matches zero or more directories
7. **Single asterisk** (`*`) matches zero or more characters except `/`
8. **Question mark** (`?`) matches exactly one character except `/`
9. **Character ranges** (`[abc]`) match any character in the range
10. **Negated character ranges** (`[!abc]`) match any character not in the range

## Integration with Roo-Code Systems

The `.rooignore` configuration integrates with several Roo-Code subsystems:

### File Listing and Search

```typescript
// Integration with list_files tool
export async function listFiles(
  dirPath: string,
  recursive: boolean,
  fileSystemService: FileSystemService
): Promise<string[]> {
  try {
    const files = await walkDirectory(dirPath, recursive)
    
    // Filter out ignored files
    return files.filter(file => !fileSystemService.shouldIgnore(file))
  } catch (error) {
    throw new Error(`Error listing files: ${error.message}`)
  }
}
```

### Context Building

```typescript
// Integration with context building
export async function buildProjectContext(
  workspaceRoot: string,
  fileSystemService: FileSystemService
): Promise<ProjectContext> {
  const context: ProjectContext = {
    files: [],
    directories: [],
    fileContents: new Map()
  }
  
  try {
    // Walk workspace and filter ignored files
    const allFiles = await walkDirectory(workspaceRoot, true)
    const filteredFiles = allFiles.filter(file => !fileSystemService.shouldIgnore(file))
    
    // Process filtered files
    for (const file of filteredFiles) {
      // Add to context...
    }
    
    return context
  } catch (error) {
    throw new Error(`Error building project context: ${error.message}`)
  }
}
```

### File Watching

```typescript
// Integration with file watcher
export class FileWatcher {
  constructor(
    private workspaceRoot: string,
    private fileSystemService: FileSystemService
  ) {}
  
  public startWatching(): vscode.Disposable {
    return vscode.workspace.createFileSystemWatcher('**/*', true, false, false)
      .onDidChange(uri => {
        const filePath = uri.fsPath
        
        // Skip processing for ignored files
        if (this.fileSystemService.shouldIgnore(filePath)) {
          return
        }
        
        // Process file change
        this.handleFileChange(filePath)
      })
  }
}
```

## Default Ignore Patterns

Roo-Code includes several default patterns that are always applied, even if no `.rooignore` file exists:

```typescript
export const DEFAULT_IGNORE_PATTERNS = [
  // Version control
  '.git/**',
  '.svn/**',
  '.hg/**',
  
  // Node.js
  'node_modules/**',
  'npm-debug.log',
  
  // Build outputs
  'dist/**',
  'build/**',
  '.output/**',
  
  // Package manager files
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  
  // Temporary files
  '**/*.tmp',
  '**/*.temp',
  
  // Log files
  '**/*.log',
  'logs/**',
  
  // Environment and secrets
  '.env',
  '.env.*',
  '**/*.pem',
  '**/*.key',
  
  // IDE files
  '.idea/**',
  '.vscode/**',
  '**/.DS_Store',
  
  // Large media files
  '**/*.mp4',
  '**/*.mov',
  '**/*.avi',
  '**/*.mkv',
  '**/*.mp3',
  '**/*.wav',
  
  // Compiled code
  '**/*.min.js',
  '**/*.min.css',
  
  // Binary files
  '**/*.zip',
  '**/*.tar',
  '**/*.gz',
  '**/*.jar',
  '**/*.exe',
  '**/*.dll',
  '**/*.so',
  '**/*.dylib',
  
  // Model and large data files
  '**/*.onnx',
  '**/*.pb',
  '**/*.h5',
  '**/*.npy',
  '**/*.npz',
  '**/*.parquet',
  '**/*.pkl'
]
```

## Performance Considerations

The `.rooignore` system is designed for efficient file filtering:

### Caching

The implementation uses a cache to avoid repeated pattern matching:

```typescript
private ignoreCache: Map<string, boolean> = new Map()

// In shouldIgnore method:
if (this.ignoreCache.has(relativePath)) {
  return this.ignoreCache.get(relativePath)!
}
```

### Path Normalization

Paths are normalized to ensure consistent matching across platforms:

```typescript
const normalizedPath = path.normalize(filePath).replace(/\\/g, '/')
```

### Optimized Pattern Matching

The system uses micromatch for fast pattern matching:

```typescript
private matchesAnyPattern(relativePath: string): boolean {
  return this.ignorePatterns.some(pattern => {
    return micromatch.isMatch(relativePath, pattern, { dot: true })
  })
}
```

## Advanced Usage Examples

### Project-Specific Configuration

Create a `.rooignore` file in your project root with patterns specific to your project:

```
# Exclude generated code
src/generated/**

# Exclude test fixtures
tests/fixtures/**

# Exclude large documentation assets
docs/assets/videos/**

# Exclude specific configuration files
config/secrets.json
config/credentials/*.key
```

### Component-Specific Ignore Patterns

You can place `.rooignore` files in subdirectories to specify component-specific ignore patterns:

```
src/components/.rooignore     # Component-specific ignore patterns
docs/.rooignore               # Documentation-specific ignore patterns
tests/.rooignore              # Test-specific ignore patterns
```

The closest `.rooignore` file to a given file takes precedence, allowing for granular control over different parts of your project.

### Integration with Git Configuration

For consistency with Git, you can reuse your `.gitignore` patterns:

```typescript
private async loadIgnorePatterns(): Promise<void> {
  try {
    // Check for .rooignore first
    const ignoreFilePath = path.join(this.workspaceRoot, '.rooignore')
    if (await fileExists(ignoreFilePath)) {
      // Load .rooignore patterns
    }
    
    // Also check for .gitignore
    const gitIgnorePath = path.join(this.workspaceRoot, '.gitignore')
    if (await fileExists(gitIgnorePath)) {
      const content = await fs.readFile(gitIgnorePath, 'utf8')
      const gitIgnorePatterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
      
      // Add .gitignore patterns if not overridden by .rooignore
      for (const pattern of gitIgnorePatterns) {
        if (!this.ignorePatterns.includes(pattern)) {
          this.ignorePatterns.push(pattern)
        }
      }
    }
  } catch (error) {
    // Error handling
  }
}
```

## Best Practices

1. **Start Simple**: Begin with a minimal `.rooignore` file and add patterns as needed
2. **Be Specific**: Use specific patterns rather than overly broad ones
3. **Test Patterns**: Verify that your patterns work as expected
4. **Document Patterns**: Add comments to explain why certain files are ignored
5. **Regular Maintenance**: Review and update your `.rooignore` file as your project evolves
6. **Use Negation Carefully**: Negation patterns can be confusing and should be used sparingly
7. **Consider Performance**: Avoid overly complex patterns that might slow down file processing

## Conclusion

The `.rooignore` configuration system provides a powerful and flexible way to control which files and directories are processed by Roo-Code. By properly configuring your `.rooignore` file, you can optimize performance, protect sensitive information, and ensure that the AI focuses on the most relevant parts of your project.
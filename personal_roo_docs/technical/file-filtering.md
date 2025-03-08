# File Filtering in Roo-Code: Technical Guide

## Overview

File filtering is a critical component of Roo-Code that determines which files are processed, displayed, and made available to the AI assistant. This technical guide explores the implementation details, configuration options, and advanced usage patterns for the file filtering system.

## Core Architecture

Roo-Code implements a multi-layered file filtering system that applies different filters at different stages of operation. This architecture ensures that:

1. Sensitive files are protected from unauthorized access
2. Large files that would exceed token limits are handled appropriately
3. Binary files are processed with suitable methods
4. Irrelevant files are excluded to reduce noise

### File Filtering Pipeline

The file filtering pipeline consists of several stages, each applying different types of filters:

```typescript
// Simplified representation of the filtering pipeline
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

Each stage in the pipeline narrows down the set of files based on specific criteria, ensuring that only appropriate files are processed.

## File Filtering Components

### 1. Ignore Pattern Filtering

The primary mechanism for excluding files is through ignore patterns, which are implemented similarly to `.gitignore`:

```typescript
// Core implementation in FileSystemService
export class FileSystemService {
  private ignorePatterns: string[] = [];
  private ignoreCache: Map<string, boolean> = new Map();
  
  constructor(private workspaceRoot: string) {
    this.loadIgnorePatterns();
  }
  
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
  
  // Check if a file should be ignored
  public shouldIgnore(filePath: string): boolean {
    // Implementation details...
  }
}
```

This component handles both custom `.rooignore` files and default exclusion patterns.

### 2. File Size Filtering

Files that exceed size thresholds are filtered out to prevent context overflow:

```typescript
// Implementation in core filtering module
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

The size threshold is configurable and can be adjusted based on available context window size.

### 3. Binary File Detection

Binary files require special handling and are identified through multiple methods:

```typescript
// Implementation in file-utils.ts
export async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    // Method 1: Check file extension against known binary types
    if (hasKnownBinaryExtension(filePath)) {
      return true;
    }
    
    // Method 2: Sample file content and check for binary characters
    const buffer = await fs.readFile(filePath, { encoding: null });
    
    // Check first 4KB of the file for null bytes and non-printable characters
    const sampleSize = Math.min(4096, buffer.length);
    const sample = buffer.slice(0, sampleSize);
    
    // Count binary characters
    let binaryCharCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Check for null bytes and control characters (except whitespace)
      if (byte === 0 || (byte < 32 && ![9, 10, 13].includes(byte)) || byte >= 127) {
        binaryCharCount++;
      }
    }
    
    // If more than 10% of characters are binary, consider it a binary file
    return binaryCharCount > sampleSize * 0.1;
    
  } catch (error) {
    console.error(`Error checking if ${filePath} is binary:`, error);
    return true; // Assume binary on error
  }
}
```

This multi-method approach ensures accurate detection of binary files even when they have non-standard extensions.

### 4. MIME Type Filtering

Files can be filtered based on their MIME types, which are determined from content or extensions:

```typescript
// Implementation in mime-type-filter.ts
export async function filterByMimeType(
  filePaths: string[],
  allowedMimeTypes: string[]
): Promise<string[]> {
  return Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const mimeType = await detectMimeType(filePath);
        return {
          path: filePath,
          mimeType,
          keep: allowedMimeTypes.includes(mimeType) || 
                allowedMimeTypes.includes('*/*')
        };
      } catch (error) {
        console.error(`Error detecting MIME type for ${filePath}:`, error);
        return { path: filePath, mimeType: 'unknown', keep: false };
      }
    })
  ).then(results => results.filter(result => result.keep).map(result => result.path));
}

// Helper function to detect MIME type
async function detectMimeType(filePath: string): Promise<string> {
  // Use file extension first for efficiency
  const ext = path.extname(filePath).toLowerCase();
  const mimeByExt = MIME_TYPES_MAP[ext];
  if (mimeByExt) {
    return mimeByExt;
  }
  
  // Fall back to content-based detection for unknown extensions
  try {
    const buffer = await fs.readFile(filePath, { encoding: null });
    return detectMimeTypeFromContent(buffer);
  } catch (error) {
    return 'application/octet-stream'; // Default binary type
  }
}
```

MIME type filtering is particularly useful for operations that only support specific file types.

### 5. Extension-Based Filtering

A simple but effective filtering method based on file extensions:

```typescript
// Implementation in extension-filter.ts
export function filterByExtension(
  filePaths: string[],
  allowedExtensions: string[]
): string[] {
  // Normalize extensions (ensure they start with dot)
  const normalizedExtensions = allowedExtensions.map(ext => 
    ext.startsWith('.') ? ext : `.${ext}`
  );
  
  return filePaths.filter(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    return normalizedExtensions.includes(ext) || 
           normalizedExtensions.includes('.*');
  });
}
```

This is commonly used for language-specific operations or tool restrictions.

## Integration with Tool Permissions

File filtering is deeply integrated with Roo-Code's permission system:

```typescript
// From src/core/Cline.ts in validateFileOperation
export async function validateFileOperation(
  path: string,
  operation: string
): Promise<boolean> {
  const currentMode = this.currentMode;
  
  // Check if edit group is allowed
  if (!this.isToolGroupAllowed("edit")) {
    throw new Error(`${operation} operation not allowed in ${currentMode.name} mode`);
  }
  
  // Check file restriction
  if (!checkFileRestriction(path, currentMode)) {
    const editGroup = currentMode.groups.find(g => 
      Array.isArray(g) && g[0] === "edit") as [string, FileRestriction];
    
    throw new FileRestrictionError(
      `File ${path} does not match the allowed pattern for ${currentMode.name} mode`,
      editGroup[1].fileRegex,
      editGroup[1].description
    );
  }
  
  // Check if file is ignored
  if (this.fileSystemService.shouldIgnore(path)) {
    throw new Error(`Cannot ${operation} ignored file: ${path}`);
  }
  
  return true;
}
```

This ensures that:
1. Mode permissions are respected
2. File pattern restrictions are enforced
3. Ignored files are protected

## Default File Exclusions

Roo-Code includes a set of default exclusion patterns that are always applied:

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
];
```

These defaults protect sensitive files and exclude common binary or large files that would be unsuitable for context inclusion.

## Tool-Specific File Filtering

Different tools apply filtering in different ways:

### 1. List Files Tool

```typescript
// Implementation in list-files.ts
export async function listFiles(
  dirPath: string,
  recursive: boolean,
  fileSystemService: FileSystemService
): Promise<string[]> {
  try {
    const files = await walkDirectory(dirPath, recursive);
    
    // Filter out ignored files
    return files.filter(file => !fileSystemService.shouldIgnore(file));
  } catch (error) {
    throw new Error(`Error listing files: ${error.message}`);
  }
}
```

This tool filters out ignored files from directory listings.

### 2. Search Files Tool

```typescript
// Implementation in search-files.ts
export async function searchFiles(
  options: SearchOptions,
  fileSystemService: FileSystemService
): Promise<SearchResult[]> {
  const { path: dirPath, regex, filePattern } = options;
  
  try {
    // Get all files in directory
    const allFiles = await walkDirectory(dirPath, true);
    
    // Apply ignore patterns
    const nonIgnoredFiles = allFiles.filter(file => 
      !fileSystemService.shouldIgnore(file)
    );
    
    // Apply file pattern if specified
    const matchingFiles = filePattern 
      ? micromatch.match(nonIgnoredFiles, filePattern)
      : nonIgnoredFiles;
    
    // Apply file size filter
    const sizeFilteredFiles = await filterBySize(matchingFiles, MAX_SEARCHABLE_FILE_SIZE);
    
    // Apply binary file filter
    const textFiles = await filterOutBinaryFiles(sizeFilteredFiles);
    
    // Search in remaining files
    return await searchInFiles(textFiles, regex);
  } catch (error) {
    throw new Error(`Error searching files: ${error.message}`);
  }
}
```

This tool applies multiple filters to ensure efficient and relevant search results.

### 3. Read File Tool

```typescript
// Implementation in read-file.ts
export async function readFile(
  filePath: string,
  fileSystemService: FileSystemService
): Promise<string> {
  try {
    // Check if file is ignored
    if (fileSystemService.shouldIgnore(filePath)) {
      throw new Error(`Cannot read ignored file: ${filePath}`);
    }
    
    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_READABLE_FILE_SIZE) {
      throw new Error(`File too large to read: ${filePath} (${formatFileSize(stats.size)})`);
    }
    
    // Check if file is binary
    const isBinary = await isBinaryFile(filePath);
    if (isBinary) {
      // For binary files, try to extract text if possible
      return await extractTextFromFile(filePath);
    }
    
    // Read text file content
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
}
```

This tool applies filters to protect sensitive files and handle binary content appropriately.

## Performance Optimization Techniques

Roo-Code implements several techniques to optimize file filtering performance:

### 1. Caching

Ignore status results are cached to avoid repeated expensive checks:

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

This significantly improves performance when filtering large directory structures.

### 2. Early Termination

Pattern matching uses early termination when possible:

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

This optimizes pattern matching by checking simple patterns before complex ones.

### 3. Parallel Processing

File filtering operations use parallel processing when appropriate:

```typescript
// Example of parallel file size checking
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

This takes advantage of Node.js's asynchronous I/O for better performance.

## Configuration Options

Several configuration options control file filtering behavior:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxFileSize` | Number | 1048576 (1MB) | Maximum file size for inclusion in context |
| `maxSearchableFileSize` | Number | 5242880 (5MB) | Maximum file size for search operations |
| `includeHiddenFiles` | Boolean | false | Whether to include hidden files in operations |
| `excludeGitIgnoredFiles` | Boolean | true | Whether to respect .gitignore patterns |
| `fileEncoding` | String | 'utf8' | Default encoding for text file operations |
| `maxFilesToProcess` | Number | 1000 | Maximum number of files to process in batch operations |

These can be configured through VS Code settings:

```json
{
  "roo-cline.fileFiltering": {
    "maxFileSize": 2097152,
    "maxSearchableFileSize": 10485760,
    "includeHiddenFiles": true,
    "excludeGitIgnoredFiles": true,
    "fileEncoding": "utf8",
    "maxFilesToProcess": 2000
  }
}
```

## Advanced File Filtering Patterns

### 1. Language-Specific Filtering

Custom filtering can be applied based on programming language:

```typescript
// Example of language-specific filtering
function filterByLanguage(
  filePaths: string[],
  language: string
): string[] {
  const languageExtensions = LANGUAGE_EXTENSIONS[language.toLowerCase()];
  if (!languageExtensions) {
    return filePaths; // No filtering if language not recognized
  }
  
  return filePaths.filter(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    return languageExtensions.includes(ext);
  });
}

// Language extension mapping
const LANGUAGE_EXTENSIONS = {
  'javascript': ['.js', '.jsx', '.mjs'],
  'typescript': ['.ts', '.tsx', '.d.ts'],
  'python': ['.py', '.pyw', '.ipynb'],
  'java': ['.java', '.jar', '.class'],
  'csharp': ['.cs', '.csx'],
  'cpp': ['.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hxx', '.h++'],
  // Other languages...
};
```

This is useful for language-specific tools or operations.

### 2. Content-Based Filtering

Files can be filtered based on their content:

```typescript
// Example of content-based filtering
async function filterByContent(
  filePaths: string[],
  contentPattern: RegExp
): Promise<string[]> {
  return (await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        // Skip binary files
        if (await isBinaryFile(filePath)) {
          return { path: filePath, keep: false };
        }
        
        const content = await fs.readFile(filePath, 'utf8');
        return { 
          path: filePath, 
          keep: contentPattern.test(content) 
        };
      } catch (error) {
        console.error(`Error checking content of ${filePath}:`, error);
        return { path: filePath, keep: false };
      }
    })
  )).filter(result => result.keep).map(result => result.path);
}
```

This can be used to find files containing specific patterns or structures.

### 3. Context-Aware Filtering

Filtering can be adapted based on the current context:

```typescript
// Example of context-aware filtering
function getContextAwareFilterPattern(
  context: {
    mode: string;
    language?: string;
    task?: string;
  }
): string[] {
  const patterns = [...DEFAULT_IGNORE_PATTERNS];
  
  // Add mode-specific patterns
  if (context.mode === 'code') {
    // Include more source files
    patterns.push('!**/*.{js,ts,py,java,c,cpp,h}');
  } else if (context.mode === 'debug') {
    // Include debug-relevant files
    patterns.push('!**/*.{log}');
    patterns.push('!**/logs/**');
  }
  
  // Add language-specific patterns
  if (context.language === 'typescript') {
    patterns.push('!**/*.{ts,tsx}');
    patterns.push('!**/tsconfig.json');
  }
  
  // Add task-specific patterns
  if (context.task?.includes('test')) {
    patterns.push('!**/*.test.{js,ts}');
    patterns.push('!**/tests/**');
    patterns.push('!**/jest.config.js');
  }
  
  return patterns;
}
```

This adapts filtering based on the current operational context.

## File Restriction Error Handling

When file operations violate restrictions, detailed errors are provided:

```typescript
// File restriction error class
export class FileRestrictionError extends Error {
  constructor(
    message: string,
    public readonly pattern: string,
    public readonly description: string | undefined,
    public readonly filePath: string
  ) {
    super(message);
    this.name = "FileRestrictionError";
  }
  
  // Format the error for display
  public getFormattedMessage(): string {
    return `Access to file "${this.filePath}" is restricted:
- This mode only allows access to: ${this.pattern}
${this.description ? `- Description: ${this.description}` : ''}
- Requested file: ${this.filePath}

Please try one of the following:
1. Switch to a mode with appropriate permissions
2. Request access to a file that matches the allowed pattern
3. Modify mode permissions if you have appropriate access`;
  }
}
```

This provides users with clear information about why access was denied and how to resolve the issue.

## Best Practices

### 1. Strategic .rooignore Usage

Create targeted .rooignore files that balance protection and accessibility:

```
# Example .rooignore
# Ignore sensitive data
secrets/
**/*.key
**/*.pem
**/*.env

# Ignore large data files, keep small samples
data/**
!data/samples/

# Ignore generated files, keep source
dist/
build/
out/

# Ignore third-party code
node_modules/
vendor/
```

This approach:
- Protects sensitive information
- Excludes large files that would consume context
- Maintains access to important source files
- Provides samples where complete data would be too large

### 2. Mode-Specific File Restrictions

Define custom modes with appropriate file restrictions:

```json
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
    },
    {
      "slug": "web-developer",
      "name": "Web Developer",
      "roleDefinition": "You are Roo, a web development specialist...",
      "groups": [
        "read",
        ["edit", { 
          "fileRegex": "\\.(html|css|js|jsx|ts|tsx)$", 
          "description": "Web development files only" 
        }]
      ]
    }
  ]
}
```

This approach:
- Limits editing capabilities to appropriate file types
- Provides clear descriptions of allowed files
- Maintains full read access for context

### 3. Performance Optimization

Optimize performance with strategic filtering:

```typescript
// Example of optimized filtering approach
async function optimizedFileFiltering(options: FilterOptions): Promise<string[]> {
  // 1. Start with fast, broad filters
  const files = await getInitialFileList(options.directory);
  
  // 2. Apply extension filtering (very fast)
  const extensionFiltered = filterByExtension(files, options.extensions);
  
  // 3. Apply ignore patterns (moderately fast with caching)
  const ignoreFiltered = applyIgnorePatterns(extensionFiltered, options.ignorePatterns);
  
  // 4. Apply size filtering (requires stat calls)
  const sizeFiltered = await filterBySize(ignoreFiltered, options.maxSize);
  
  // 5. Apply binary detection (expensive, do last)
  const binaryFiltered = options.excludeBinary 
    ? await filterOutBinaryFiles(sizeFiltered)
    : sizeFiltered;
  
  return binaryFiltered;
}
```

This approach:
- Applies fastest filters first to reduce the set for later stages
- Uses caching for expensive operations
- Performs most expensive operations on the smallest possible set

## Conclusion

The file filtering system in Roo-Code provides a robust framework for controlling which files are accessible for various operations. By understanding and properly configuring this system, you can optimize for both security and efficient context usage.

Effective file filtering:
- Protects sensitive information from unauthorized access
- Prevents context window overflow from large files
- Ensures appropriate handling of different file types
- Optimizes performance for large codebases

Through proper use of .rooignore files, mode-specific file restrictions, and configuration options, you can create a tailored environment that meets your specific requirements for security, performance, and functionality.
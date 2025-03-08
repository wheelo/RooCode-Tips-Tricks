# File Filtering in Roo-Code

## What Is File Filtering?

File filtering controls which files Roo can see and work with in your projects. This feature helps Roo focus on relevant files, protects sensitive information, and reduces unnecessary context usage.

## Why File Filtering Matters

Filtering files is important because it:
- Focuses Roo's attention on relevant code
- Protects sensitive information from being accessed
- Reduces token usage by excluding unnecessary content
- Prevents Roo from getting confused by binary or very large files

## How Roo Filters Files

Roo uses several methods to determine which files to include or exclude:

### 1. .rooignore Files

The primary way to control file filtering is through `.rooignore` files, which work like `.gitignore` files but specifically for Roo. See the [.rooignore Configuration](rooignore-configuration.md) guide for details.

### 2. Default Exclusions

Roo automatically excludes certain files even without a `.rooignore` file:
- Version control directories (`.git/`, `.svn/`)
- Package manager files (`node_modules/`, `package-lock.json`)
- Build directories (`dist/`, `build/`)
- Environment and credential files (`.env`, `*.key`)
- Binary and media files (`*.exe`, `*.mp4`)
- Large data files (`*.parquet`, `*.npy`)

### 3. Size Limits

Files exceeding certain size thresholds are filtered out:
- Files over 1MB are typically excluded from general context
- Files over 5MB are excluded from search operations
- Very large files may be partially included with content truncation

### 4. Binary Detection

Roo automatically detects and handles binary files differently:
- Most binary files are excluded from general operations
- Some binary formats (like PDFs or Word docs) may have text extracted
- Images and other media files are excluded by default

## Controlling File Filtering

You can control file filtering in several ways:

### Using .rooignore Files

Create a `.rooignore` file in your project root with patterns of files to exclude:

```
# Exclude large data files
data/*.csv
logs/*.log

# Exclude sensitive information
.env
secrets/

# Exclude build artifacts
dist/
build/
```

See the [.rooignore Configuration](rooignore-configuration.md) guide for syntax details.

### Using @mentions for Inclusion

You can explicitly include specific files in your conversation using @mentions, even if they would normally be filtered out:

```
@/path/to/large-file.json
```

This brings the file into context for the current conversation only.

### Mode-Specific File Access

Different Roo-Code modes have different file access permissions:
- **Code mode**: Full access to read and modify files
- **Architect mode**: Can read all files but only modify markdown files
- **Ask mode**: Can only read files, not modify them
- **Debug mode**: Full access to read and modify files

Custom modes can have even more specific file access rules.

## File Filtering Best Practices

### 1. Start with Default Exclusions

Roo's default exclusions work well for most projects. Only create a `.rooignore` file when you need to customize filtering.

### 2. Use Strategic Patterns

Exclude files based on these criteria:
- **Size**: Large files that consume too many tokens
- **Relevance**: Files not needed for your current work
- **Sensitivity**: Files with secrets or personal data
- **Complexity**: Files that might confuse Roo (like minified code)

### 3. Include Sample Data

When excluding large data directories, consider including small samples:

```
# Exclude all data files
data/

# But include samples
!data/samples/
```

### 4. Balance Filtering

There's a balance to file filtering:
- **Too little filtering**: Wastes tokens on irrelevant content
- **Too much filtering**: Removes context Roo needs to understand your project

### 5. Use Project-Specific Filtering

Different projects need different filtering strategies:
- **Web projects**: Filter large media assets, include key code files
- **Data science**: Filter large datasets, include notebooks and scripts
- **Backend services**: Filter logs and temporary files, include source code

## Examples by Project Type

### Web Development

```
# Node modules and package files
node_modules/
package-lock.json
yarn.lock

# Build directories
dist/
build/
.next/

# Large assets
public/images/
public/videos/
public/assets/*.psd

# Keep examples
!public/images/examples/
```

### Data Science

```
# Data files
data/*.csv
data/*.parquet
data/*.json

# Keep samples
!data/samples/

# Models
models/*.h5
models/*.onnx

# Notebooks checkpoints
.ipynb_checkpoints/
```

### Backend Services

```
# Logs and temporary files
logs/
tmp/
*.log

# Local configuration
.env
.env.local
config/local.js

# Docker related
.docker/
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Important file is being ignored | Use @mention to include it or add `!` pattern in .rooignore |
| Roo is missing context | Check if key files are being filtered out |
| Too many tokens used | Add more patterns to .rooignore to exclude irrelevant files |
| Sensitive data exposed | Add patterns to exclude sensitive directories and file types |

## Key Points to Remember

- File filtering helps focus Roo's attention on relevant files
- `.rooignore` works like `.gitignore` but specifically for Roo
- Default exclusions handle common cases automatically
- Balance filtering to include necessary context while excluding noise
- Different project types need different filtering strategies
# .rooignore Configuration in Roo-Code

## What is .rooignore?

A `.rooignore` file tells Roo which files to ignore when examining your project. This helps Roo focus on relevant files, avoid sensitive information, and reduce token usage. It works like `.gitignore` but specifically for Roo's operations.

## Creating a .rooignore File

1. Create a file named `.rooignore` in your project's root directory
2. Add patterns for files and directories you want Roo to ignore
3. Save the file - Roo will automatically respect these patterns

## Pattern Syntax

.rooignore uses pattern matching similar to .gitignore:

| Pattern | What It Does |
|---------|-------------|
| `file.txt` | Ignores a specific file |
| `*.log` | Ignores all files with the .log extension |
| `node_modules/` | Ignores an entire directory |
| `logs/*.txt` | Ignores all .txt files in the logs directory |
| `**/*.tmp` | Ignores .tmp files in any directory |
| `!important.log` | Includes a file that would otherwise be ignored |

## Common Use Cases

### Excluding Large Files

Large files consume lots of tokens and rarely provide useful context:

```
# Exclude large files
*.mp4
*.zip
*.pdf
data/*.csv
```

### Protecting Sensitive Information

Keep credentials and sensitive data private:

```
# Exclude sensitive files
.env
secrets/
**/*.key
config/credentials.json
```

### Ignoring Build Artifacts

Build outputs are usually unnecessary:

```
# Exclude build artifacts
dist/
build/
out/
*.min.js
```

### Excluding Third-Party Code

Third-party code is usually noise for Roo:

```
# Exclude third-party code
node_modules/
vendor/
bower_components/
```

## Default Ignored Files

Roo automatically ignores these common files and directories, even without a .rooignore file:

- Version control: `.git/`, `.svn/`
- Package managers: `node_modules/`, `package-lock.json`
- Build outputs: `dist/`, `build/`
- Environment files: `.env`, `.env.*`
- Credentials: `**/*.key`, `**/*.pem`
- IDE files: `.vscode/`, `.idea/`
- Logs: `**/*.log`, `logs/`
- Media files: `**/*.mp4`, `**/*.mp3`
- Binary files: `**/*.exe`, `**/*.dll`, `**/*.zip`

## Advanced Usage

### Directory-Specific Ignores

You can place `.rooignore` files in subdirectories to create more specific rules:

```
project/
├── .rooignore            # Project-wide rules
├── src/
│   └── .rooignore        # Rules specific to src/
└── tests/
    └── .rooignore        # Rules specific to tests/
```

Rules in subdirectories apply only to files within that directory and its subdirectories.

### Using .gitignore Rules

If you don't create a `.rooignore` file, Roo will also check for a `.gitignore` file and use those patterns. This gives you a head start if you're already using Git.

## Best Practices

1. **Keep It Simple**: Start with a minimal .rooignore and add patterns as needed
2. **Be Specific**: Use precise patterns rather than overly broad ones
3. **Document Your Choices**: Add comments explaining why certain files are ignored
4. **Check Results**: Use Roo to list files to verify your patterns work as expected
5. **Balance**: Exclude enough to focus Roo, but not so much that it misses context

## Real-World Examples

### Web Development Project

```
# Dependencies
node_modules/
bower_components/

# Build outputs
dist/
build/
*.min.js
*.min.css

# Development files
.env
.env.*
config/local.json

# Large media files
public/videos/
public/assets/*.psd

# Keep example files
!public/assets/examples/
```

### Data Science Project

```
# Large data files
data/*.csv
data/*.parquet
models/*.onnx

# Keep sample data
!data/samples/

# Virtual environments
venv/
.virtualenv/

# Jupyter checkpoints
.ipynb_checkpoints/

# Output files
outputs/
results/*.png
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Roo still sees ignored files | Ensure your `.rooignore` file is in the right location |
| Pattern not working | Check syntax; remember to use `**/` for matching in all directories |
| Too many files excluded | Use negation patterns (`!pattern`) to include specific files |
| Roo missing important context | Your patterns might be too broad; make them more specific |
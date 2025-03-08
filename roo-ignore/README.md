# Roo-Ignore Generator

A utility script that automatically generates and updates `.rooignore` files to prevent LLM context overflow while preserving your custom content.

## Overview

1. Identifying files that exceed your specified token threshold
2. Adding minimal patterns for binary file types that wouldn't be useful to the LLM
3. Preserving existing content and custom patterns in your `.rooignore` file

This ensures Roo-Code's LLM can operate efficiently without context overflow issues, while respecting your specific project needs.

## Installation

Generally you want to put this file in the project root and run it. If you are using bash you can use wget
```bash
wget https://raw.githubusercontent.com/Michaelzag/RooCode-Tips-Tricks/main/roo-ignore/generate-rooignore.js
```
then:

```bash
node generate-rooignore.js node generate-rooignore.js --threshold=30000
```

if it doensm't work you might need to chmod +x

## Advanced Usage

```bash
node generate-rooignore.js [directory] [--threshold=NUMBER]
```

### Options

- `[directory]` - The directory to analyze (defaults to current directory)
- `--threshold=NUMBER` - Set custom token threshold (default: 45000)
- `--help` - Show help information

### Examples

```bash
# Generate for current directory with default threshold (45k tokens)
node generate-rooignore.js

# Set a custom threshold
node generate-rooignore.js --threshold=30000

# Generate for a specific directory
node generate-rooignore.js ./my-project

# Display help information
node generate-rooignore.js --help
```

## Features

### Token Estimation

The script uses a simple estimation method:
- Approximately 4 characters ≈ 1 token
- Binary files are auto-detected and handled appropriately

### Smart Skipping for Efficient Scanning

- Skips only essential directories like `.git`, `venv`,  `node_modules` during scanning. There should be no readon the llm should be accessing these folders anyhow. 
- Uses insights from .gitignore to identify additional directories to skip
- Only skips directories when scanning, not in the final ignore patterns

### Minimal Ignore Patterns

- Only adds large files that exceed your token threshold
- Includes minimal binary file patterns that are definitely not useful to an LLM

### Preserving Custom Content

The script is designed to preserve your custom modifications:
- Only updates the large files section of existing .rooignore files
- Maintains your custom patterns and structure
- Adds new large files when detected

## How It Works

1. Scans files in the target directory (skipping specific directories for efficiency)
2. Estimates token count for each file
3. Identifies files exceeding the specified threshold
4. Intelligently updates or creates a .rooignore file

## Best Practices

- Run periodically after adding new large files to projects
- Set an appropriate threshold based on your LLM's context window (45k is a good default)
- Review the .rooignore file after generation to ensure it meets your needs
- Consider adding custom patterns for your specific project needs
- Review generated files to ensure they don't block important project files

## License

This script is provided as-is for use with Roo-Code.
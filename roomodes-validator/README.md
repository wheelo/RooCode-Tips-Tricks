# Roo Modes Validator

A validation tool for checking `.roomodes` files in Roo-Code projects.

## Overview

This script validates `.roomodes` configuration files for correct formatting and content according to the Roo-Code specifications. It can identify common issues and optionally fix them automatically.

## Usage

```bash
node validate-roomodes.js [options] [path]
```

## Options

- `-h, --help`: Show help message
- `-f, --fix`: Generate a fixed version of the file
- `-o, --output PATH`: Specify output path for fixed file (default: ./.roomodes-fixed)

## Examples

```bash
# Validate .roomodes in current directory
node validate-roomodes.js

# Validate a specific file
node validate-roomodes.js ./path/to/.roomodes

# Fix a file and save to default path (.roomodes-fixed)
node validate-roomodes.js --fix 

# Fix a file and save to custom path
node validate-roomodes.js --fix --output ./fixed.roomodes
```

## Validation Rules

The validator checks for these issues:

### Structure Issues
- Missing or invalid "customModes" array (proper key name)
- Empty customModes array

### Mode Validation
- **Slug**: Must be present, unique, and contain only lowercase letters, numbers, and hyphens
- **Name**: Must be present
- **RoleDefinition**: Must be present and be a string (warns if it doesn't start with "You are Roo")
- **Groups**: Must be an array containing valid tool groups

### Group Validation
- Must be one of the valid tool groups: `read`, `edit`, `browser`, `command`, `mcp`
- File restrictions must have valid `fileRegex` and `description` properties
- Regex patterns must be properly escaped for JSON context

## Auto-fix Capabilities

When run with the `--fix` flag, the script can correct:

- Rename `modes` key to `customModes` if needed
- Fix invalid slug formats
- Add missing required fields with sensible defaults
- Fix invalid group definitions
- Correct regex escaping in file restriction patterns
- Ensure unique slugs by adding suffixes when needed

## Exit Codes

- `0`: Validation successful (no errors)
- `1`: Validation failed (errors found)
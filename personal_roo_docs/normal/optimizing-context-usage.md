# Optimizing Context Usage in Roo-Code

## What is Context and Why It Matters

Context is Roo's "working memory" - the information it can access at any moment. This includes:

1. Your conversation history
2. Code and files from your project
3. Instructions that tell Roo how to operate
4. Information about your workspace

Context space is limited and valuable. When it fills up, Roo must forget older parts of your conversation or limit how much code it can see. This guide helps you optimize context usage for better results.

## Quick Optimization Tips

1. **Create a `.rooignore` file** in your project root to exclude irrelevant files
2. **Close unnecessary editor tabs** before starting complex tasks
3. **Start new conversations** for different topics rather than continuing long ones
4. **Use specific file mentions** with `@/path/to/file.js` instead of entire directories
5. **Clear your terminal** before running commands you'll reference
6. **Disable experimental features** you're not actively using

## Reducing File Context

### Using .rooignore

Create a `.rooignore` file in your project root to exclude files:

```
# Example .rooignore
node_modules/
dist/
*.log
data/*.csv
public/images/
```

This works like `.gitignore` but specifically for Roo. Excluded files won't consume context space.

### Key Files to Typically Ignore

- **Dependencies**: `node_modules/`, `vendor/`, `packages/`
- **Build outputs**: `dist/`, `build/`, `out/`
- **Large data**: `*.csv`, `*.json` (unless small), database files
- **Media files**: images, videos, audio files
- **Logs and temporary files**: `*.log`, `tmp/`
- **Hidden and configuration files**: `.git/`, `.idea/`, `.vscode/`

### Using @ Mentions Effectively

Reference specific files or line ranges instead of entire directories:

```
// Specific file
@/src/components/Button.jsx

// Specific lines
@/src/utils/helpers.js:15-30
```

This brings only relevant code into context.

## Conversation Management

### When to Start New Conversations

Start a new conversation when:
- Changing to a completely different topic
- The token usage indicator shows more than 70% used
- Roo seems to be "forgetting" earlier parts of your conversation
- You're moving to a different part of your codebase

### Using Tasks

Roo's task system helps organize different conversations:
1. Create separate tasks for different aspects of your project
2. Name tasks clearly based on their purpose
3. Switch between tasks as needed

## Settings That Affect Context

### Open Tab Limit

**Setting**: `maxOpenTabsContext`

This controls how many of your open editor tabs Roo includes in context:
- **Recommended**: 3-5 for most work
- **Set to 0**: When working with a lot of files and you'll use @mentions instead
- **Increase to 10+**: Only when relationships between many files are crucial

### Terminal Output Lines

**Setting**: `terminalOutputLineLimit`

This limits how many terminal output lines Roo includes:
- **Recommended**: 20-50 for general use
- **Increase to 100+**: Only when analyzing build outputs or logs

### File Size Limits

Roo automatically excludes:
- Files larger than 1MB from general context
- Files larger than 5MB from search operations

You don't need to change these unless you have specific requirements.

## Mode Selection for Context Efficiency

Different modes include different tools, affecting context usage:

- **Ask mode**: Includes minimal tools, preserving context for answers
- **Code mode**: Includes all coding tools, using more context
- **Architect mode**: Balanced tool set with Markdown editing only

Choose the mode that includes only what you need for your current task.

## Experimental Features

Some experimental features affect context usage:

| Feature | Effect on Context | When to Use |
|---------|------------------|-------------|
| Power Steering | Uses significantly more context | Only when strict rule following is critical |
| Multi-Block Search/Replace | Moderate context usage | When making coordinated changes |
| Search and Replace | Minor context usage | For general text replacements |
| Insert Content | Minor context usage | For adding new code sections |

Disable features you're not actively using to save context.

## MCP Server Optimization

MCP servers (Model Context Protocol) add tools and resources to Roo, but also consume context space:

- Disable `mcpEnabled` when not using external servers
- Connect only the servers you actively need
- Remove unnecessary servers from your configuration

## Monitoring Context Usage

Pay attention to these indicators:

1. **Token usage percentage** in the UI status bar
2. **Warning indicators** when approaching context limits
3. **Messages about truncated conversations**
4. **How much code Roo seems to remember**

If Roo appears to be forgetting context, use the strategies in this guide to optimize.

## Real-World Optimization Examples

### Web Development Project

```
# .rooignore for web project
node_modules/
dist/
.next/
public/images/
coverage/
*.min.js
*.min.css

# Keep examples
!public/examples/
```

### Data Science Project

```
# .rooignore for data science
data/*.csv
models/*.onnx
venv/
.ipynb_checkpoints/
outputs/

# Keep small samples
!data/samples/
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Conversation getting too long | Start a new task or conversation |
| Roo forgetting earlier context | Mention important points again or start fresh |
| Large codebase overwhelming context | Create targeted .rooignore file |
| Terminal output too verbose | Clear terminal before important commands |
| Too many files in context | Close unnecessary editor tabs |

Remember: optimizing context is about focusing Roo's attention on what matters most for your current task.
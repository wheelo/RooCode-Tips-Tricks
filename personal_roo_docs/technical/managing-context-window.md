# Managing the Context Window in Roo-Code

## Overview

The context window is a critical resource in LLM-powered assistants like Roo-Code. It represents the amount of information that can be provided to the model at once and directly impacts the assistant's ability to understand your project and respond effectively. This guide documents all configurable features that affect the context window size and provides strategies for optimizing it.

## Context Window Components

In Roo-Code, the context window consists of several components:

1. **System Prompt**: Contains instructions, capabilities, and rules
2. **Conversation History**: Previous messages exchanged with the model
3. **Code Context**: Source code and file content from your project
4. **Environmental Information**: Details about your workspace and system
5. **Tool Instructions**: Descriptions of available tools and their usage

Understanding how each component contributes to context usage helps you make informed decisions about optimization.

## Configurable Features That Affect Context Size

### Core Settings

| Setting | Type | Default | Description | Impact on Context |
|---------|------|---------|-------------|-------------------|
| `maxOpenTabsContext` | Number | 10 | Maximum number of VSCode open tabs to include in context | Higher values include more open files in context |
| `terminalOutputLineLimit` | Number | 100 | Maximum number of terminal output lines to include | Higher values include more terminal output in context |
| `fuzzyMatchThreshold` | Number | 0.8 | Threshold for fuzzy matching in diff operations | Lower values may lead to more verbose diff explanations |
| `writeDelayMs` | Number | 50 | Delay between writes for streaming responses | Affects chunking of responses, indirectly impacting context use |

### Experimental Features

| Feature | Setting ID | Description | Impact on Context |
|---------|------------|-------------|-------------------|
| Power Steering | `powerSteering` | Reminds the model about mode definition more frequently | Significantly increases context usage by repeating instructions |
| Unified Diff Strategy | `experimentalDiffStrategy` | Alternative approach to handling file modifications | Moderate impact; may use more context for diff explanations |
| Search and Replace | `search_and_replace` | Performs multiple search/replace operations at once | Minor impact; may require additional context for complex operations |
| Insert Content | `insert_content` | Inserts content at specific line positions | Minor impact; may require additional context to describe insertions |
| Multi-Block Search and Replace | `multi_search_and_replace` | Updates multiple blocks in a file in a single operation | Moderate impact; requires additional context for coordinating multiple changes |

### Permission Settings

| Setting | Type | Description | Impact on Context |
|---------|------|-------------|-------------------|
| `alwaysAllowReadOnly` | Boolean | Auto-approve read-only operations | Affects which tools are included in context |
| `alwaysAllowWrite` | Boolean | Auto-approve write operations | Affects which tools are included in context |
| `alwaysAllowExecute` | Boolean | Auto-approve execute operations | Affects which tools are included in context |
| `alwaysAllowBrowser` | Boolean | Auto-approve browser operations | Affects which tools are included in context |
| `alwaysAllowMcp` | Boolean | Auto-approve MCP operations | Affects which tools are included in context |
| `diffEnabled` | Boolean | Enable diff operations | When disabled, removes diff tools from context |
| `mcpEnabled` | Boolean | Enable MCP functionality | When disabled, removes MCP tools and servers from context |

### Mode-Specific Settings

| Setting | Description | Impact on Context |
|---------|-------------|-------------------|
| Mode Selection | Current operational mode | Different modes include different tools and instructions |
| Custom Mode Definition | Custom role and tool permissions | More complex custom modes may use more context |
| Custom Instructions | User-provided instructions | Adds to context in proportion to instruction length |

## Context Window Management Strategies

### 1. Sliding Window Implementation

Roo-Code implements a sliding window approach to manage long conversations:

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

When conversations become too long, this function:
1. Always preserves the first message (system prompt)
2. Removes a specified fraction of older messages
3. Keeps the most recent exchanges intact

This happens automatically when the token count approaches the context limit:

```typescript
export function truncateConversationIfNeeded({
  messages,
  totalTokens,
  contextWindow,
  maxTokens,
}: TruncateOptions): Anthropic.Messages.MessageParam[] {
  const allowedTokens = contextWindow - (maxTokens || contextWindow * 0.2)
  return totalTokens < allowedTokens ? messages : truncateConversation(messages, 0.5)
}
```

### 2. Optimizing Open Tabs Context

The `maxOpenTabsContext` setting controls how many open VSCode tabs are included in the context:

```json
{
  "roo-cline.maxOpenTabsContext": 5
}
```

Best practices:
- Use 0 to exclude all open tabs from context
- Use 1-5 for focused contexts with minimal tabs
- Use 10+ only when the relationship between multiple files is critical
- Close unnecessary tabs before starting complex tasks

### 3. Controlling Terminal Output

The `terminalOutputLineLimit` setting manages how much terminal output is included:

```json
{
  "roo-cline.terminalOutputLineLimit": 50
}
```

Best practices:
- Lower to 20-50 lines for basic error messages
- Increase to 100+ for detailed build output analysis
- Clear terminal before running important commands to reduce noise

### 4. Optimizing Custom Instructions

Custom instructions are added to the context and can consume significant space:

```typescript
await addCustomInstructions(
  promptComponent?.customInstructions || modeConfig.customInstructions || "", 
  globalCustomInstructions || "", 
  cwd, 
  mode, 
  { preferredLanguage }
)
```

Best practices:
- Keep global custom instructions concise
- Use mode-specific instructions for specialized needs
- Prioritize critical information over nice-to-have guidance
- Use bullet points rather than long paragraphs

### 5. Managing Permission Settings

Tool permissions affect which tools are included in the system prompt:

```typescript
getToolDescriptionsForMode(
  mode,
  cwd,
  supportsComputerUse,
  effectiveDiffStrategy,
  browserViewportSize,
  mcpHub,
  customModeConfigs,
  experiments,
)
```

Best practices:
- Disable `diffEnabled` when not needed to remove diff tools
- Disable `mcpEnabled` when not using custom servers
- Configure auto-approval settings to streamline workflows while maintaining security

### 6. Disabling Power Steering

The Power Steering experimental feature significantly increases context usage:

```typescript
{
  "roo-cline.experiments": {
    "powerSteering": false
  }
}
```

Power Steering reiterates the mode definition more frequently, which:
- Reinforces the assistant's role and guidelines
- Improves adherence to instructions
- Consumes more tokens per message
- Reduces available space for content

Only enable when strict role adherence is more important than context space.

## Advanced Context Monitoring and Optimization

### 1. Token Count Monitoring

Roo-Code displays token usage in the UI. Pay attention to:

- Total conversation tokens
- Percentage of context window used
- Warning indicators when approaching context limits

### 2. Strategic Conversation Resets

Consider starting new conversations for different tasks rather than continuing long ones, especially when:

- Changing topics significantly
- Moving to a different part of your codebase
- After completing a complex task
- When token usage exceeds 70% of the context window

### 3. Strategic Use of @mentions

When referencing files, prefer:

- Specific file @mentions over entire directories
- Snippets over entire large files
- Targeted sections using line numbers

For example:
```
Can you optimize the function in @/src/utils/parser.js:50-75?
```

### 4. Mode Selection for Context Efficiency

Different modes include different tools in the context:

- "Ask" mode includes minimal tools, preserving context for answers
- "Code" mode includes all coding tools, using more context
- Custom modes can be designed to include only necessary tools

### 5. Effect of MCP Servers on Context

MCP servers affect context usage in two ways:

1. Server descriptions are included in the system prompt:
   ```typescript
   getMcpServersSection(mcpHub, effectiveDiffStrategy, enableMcpServerCreation)
   ```

2. Server tools are documented in the context:
   ```typescript
   getToolDescriptionsForMode(
     // ...parameters including mcpHub
   )
   ```

Disabling `mcpEnabled` removes both from the context.

## Practical Examples

### Example 1: Maximizing Context for Code Understanding

```json
{
  "roo-cline.maxOpenTabsContext": 15,
  "roo-cline.terminalOutputLineLimit": 20,
  "roo-cline.experiments": {
    "powerSteering": false
  },
  "roo-cline.mcpEnabled": false,
  "roo-cline.diffEnabled": true
}
```

This configuration:
- Includes many open tabs for broader code understanding
- Minimizes terminal output
- Disables Power Steering to save context
- Disables MCP to remove server tools
- Keeps diff enabled for code analysis

### Example 2: Optimizing for Long Conversations

```json
{
  "roo-cline.maxOpenTabsContext": 3,
  "roo-cline.terminalOutputLineLimit": 50,
  "roo-cline.experiments": {
    "powerSteering": false
  }
}
```

This configuration:
- Minimizes open tabs included in context
- Provides moderate terminal output
- Disables Power Steering to save context
- Preserves more space for conversation history

### Example 3: Strict Role Compliance

```json
{
  "roo-cline.maxOpenTabsContext": 5,
  "roo-cline.terminalOutputLineLimit": 30,
  "roo-cline.experiments": {
    "powerSteering": true
  }
}
```

This configuration:
- Balances open tabs included in context
- Provides moderate terminal output
- Enables Power Steering for strict role adherence
- Accepts reduced context space for better instruction following

## Conclusion

Effective management of the context window is essential for maximizing Roo-Code's capabilities. By understanding and configuring the various features that affect context size, you can optimize for your specific workflows and requirements.

Remember that context window management involves trade-offs:
- More context space for code generally means less for conversation history
- Strict adherence to instructions may reduce available space for content
- Including more tools provides more capabilities but consumes more context

Through careful configuration and strategic usage patterns, you can strike the right balance for your needs and get the most value from Roo-Code's contextual understanding capabilities.
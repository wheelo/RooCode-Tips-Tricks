# Conversation Extraction in Roo-Code: Technical Guide

## Overview

The Conversation Extraction feature in Roo-Code enables users to export, filter, and process conversation histories from tasks. This technical guide documents the implementation, APIs, and advanced usage of the feature.

## Architecture

The conversation extraction system follows a multi-stage pipeline approach:

1. **Raw Export**: Capturing the full conversation history with all metadata
2. **Content Filtering**: Removing non-essential elements using regex patterns
3. **Message Cleaning**: Processing user and assistant messages individually
4. **Formatting**: Converting to the desired output format
5. **Optimization**: Removing duplicates and normalizing content

## Core Implementation

### Pattern-Based Content Filtering

The extraction system uses regex patterns to identify content types:

```typescript
// Core patterns for content identification
const PATTERNS = {
  // Environment details and structural content
  environmentDetails: /\<environment_details\>.*?\<\/environment_details\>/s,
  taskTag: /\<task\>(.*?)\<\/task\>/s,
  feedbackTag: /\<feedback\>(.*?)\<\/feedback\>/s,
  
  // File content and results to remove
  fileContentTag: /\<file_content path=".*?"\>.*?\<\/file_content\>/s,
  toolResult: /\[[^\]]+\] Result:.*?(?=\n\n|\Z)/s,
  
  // Tool use patterns
  toolUsePatterns: {
    writeToFile: /\<write_to_file\>.*?\<\/write_to_file\>/s,
    applyDiff: /\<apply_diff\>.*?\<\/apply_diff\>/s,
    executeCommand: /\<execute_command\>.*?\<\/execute_command\>/s,
    // Other tool patterns...
  },
  
  // Assistant thinking and responses
  thinking: /\<thinking\>(.*?)\<\/thinking\>/s,
  attemptCompletion: /\<attempt_completion\>.*?\<result\>(.*?)\<\/result\>.*?\<\/attempt_completion\>/s,
}
```

These patterns selectively filter content based on type and importance.

### Message Processing Pipeline

The system processes user and assistant messages differently:

```typescript
// Simplified extraction pipeline
export async function extractConversation(inputFile, outputFile) {
  // Read raw conversation
  const content = await fs.readFile(inputFile, 'utf8');
  
  // Extract conversation turns
  const turns = extractTurns(content);
  
  // Process each turn based on speaker
  const processedTurns = turns.map(turn => {
    if (turn.speaker === 'User') {
      return processTurn(turn, cleanUserMessage);
    } else {
      return processTurn(turn, cleanAssistantMessage);
    }
  });
  
  // Remove duplicates
  const finalTurns = removeDuplicates(processedTurns);
  
  // Format and save
  await saveConversation(finalTurns, outputFile);
  
  return getExtractionMetrics(content, finalTurns);
}
```

### User Message Cleaning

```typescript
function cleanUserMessage(message) {
  // Remove environment details
  message = removePattern(message, PATTERNS.environmentDetails);
  
  // Remove tool results
  message = removePattern(message, PATTERNS.toolResult);
  
  // Remove file content
  message = removePattern(message, PATTERNS.fileContentTag);
  
  // Extract task content
  message = extractPattern(message, PATTERNS.taskTag);
  
  return normalizeWhitespace(message);
}
```

### Assistant Message Cleaning

```typescript
function cleanAssistantMessage(message) {
  // Clean thinking sections
  message = processThinkingSections(message);
  
  // Extract completion results
  message = extractCompletionResults(message);
  
  // Remove or simplify tool uses
  message = procesToolUses(message);
  
  return normalizeWhitespace(message);
}
```

### Duplicate Content Removal

```typescript
function removeDuplicates(turns) {
  // Track seen content
  const seen = new Map();
  
  return turns.map(turn => {
    // Split message into paragraphs
    const paragraphs = turn.message.split(/\n\n+/);
    
    // Filter out duplicate paragraphs
    const uniqueParagraphs = paragraphs.filter(para => {
      // Skip short paragraphs
      if (para.length < 10) return true;
      
      // Create simplified version for comparison
      const simplified = simplifyForComparison(para);
      
      // Keep if not seen before
      if (!seen.has(simplified)) {
        seen.set(simplified, true);
        return true;
      }
      
      return false;
    });
    
    return {
      ...turn,
      message: uniqueParagraphs.join('\n\n')
    };
  });
}
```

## Export API

Roo-Code provides a programmatic API for task history exports:

```typescript
export interface ExportOptions {
  taskId: string;
  format: 'markdown' | 'json' | 'txt';
  cleanupLevel: 'minimal' | 'moderate' | 'aggressive';
  includeMetadata: boolean;
  outputPath?: string;
}

export async function exportTaskHistory(options: ExportOptions): Promise<ExportResult> {
  const taskHistory = await getTaskHistory(options.taskId);
  const processed = processTaskHistory(taskHistory, options);
  
  if (options.outputPath) {
    await fs.writeFile(options.outputPath, processed.content);
  }
  
  return processed;
}
```

## Output Formats

### Markdown Format

```markdown
**User:**

How can I optimize my React components for performance?

---

**Assistant:**

Here are the key strategies for optimizing React components:

1. Use React.memo for functional components
2. Implement shouldComponentUpdate for class components
3. Use the useCallback hook for event handlers
```

### JSON Format

```json
{
  "conversation": [
    {
      "speaker": "User",
      "message": "How can I optimize my React components for performance?",
      "timestamp": "2023-06-15T14:32:45Z"
    },
    {
      "speaker": "Assistant",
      "message": "Here are the key strategies for optimizing React components:\n\n1. Use React.memo for functional components\n2. Implement shouldComponentUpdate for class components\n3. Use the useCallback hook for event handlers",
      "timestamp": "2023-06-15T14:32:58Z"
    }
  ],
  "metadata": {
    "taskId": "task_123456",
    "mode": "code",
    "startTime": "2023-06-15T14:32:40Z",
    "endTime": "2023-06-15T14:35:12Z"
  }
}
```

## Command Line Interface

Roo-Code provides a CLI interface for conversation extraction:

```bash
roo export-task <task-id> [options]

Options:
  --format <format>        Output format (markdown, json, txt) [default: markdown]
  --cleanup <level>        Cleanup level (minimal, moderate, aggressive) [default: moderate]
  --output <path>          Output file path
  --metadata               Include task metadata [default: false]
```

## Configuration Options

The following settings control conversation extraction behavior:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `extractionCleanupLevel` | String | "moderate" | Default cleanup level for extractions |
| `preserveThinking` | Boolean | true | Whether to preserve thinking tags |
| `preserveCodeBlocks` | Boolean | true | Whether to preserve code blocks |
| `removeToolUses` | Boolean | true | Whether to remove tool use blocks |
| `removeEnvironmentDetails` | Boolean | true | Whether to remove environment details |
| `deduplicateContent` | Boolean | true | Whether to remove duplicate content |

## Integration with Task Management

Conversation extraction integrates with Roo-Code's task management system:

```typescript
// Export from task management UI
export async function exportCurrentTask(format = 'markdown'): Promise<void> {
  const taskManager = getTaskManager();
  const currentTask = taskManager.getCurrentTask();
  
  if (!currentTask) {
    throw new Error('No active task');
  }
  
  const options = {
    taskId: currentTask.id,
    format,
    cleanupLevel: vscode.workspace.getConfiguration('roo-cline').get('extractionCleanupLevel'),
    includeMetadata: true
  };
  
  const result = await exportTaskHistory(options);
  
  // Show in editor
  const doc = await vscode.workspace.openTextDocument({
    content: result.content,
    language: getLanguageForFormat(format)
  });
  
  await vscode.window.showTextDocument(doc);
}
```

## Performance Considerations

The extraction process can be resource-intensive for large conversations. Optimizations include:

1. **Lazy Regex Evaluation**: Patterns are compiled once and reused
2. **Incremental Processing**: Processes the conversation in chunks
3. **Caching**: Previously cleaned messages are cached
4. **Streaming Output**: For large exports, content is written incrementally

## Security and Privacy

Conversation extraction includes several security features:

1. **Sensitive Content Detection**: Identifies and optionally redacts API keys, tokens, etc.
2. **Metadata Filtering**: Removes system-specific details from metadata
3. **Permission Checks**: Verifies user has appropriate permissions to export tasks

## Extension Points

The extraction system provides extension points for custom processing:

```typescript
// Register a custom message processor
registerMessageProcessor('customType', (message, context) => {
  // Custom processing logic
  return processedMessage;
});

// Register a custom format handler
registerFormatHandler('custom', {
  contentType: 'application/x-custom',
  fileExtension: '.custom',
  format: (conversation) => {
    // Custom formatting logic
    return formattedContent;
  }
});
```

## Conclusion

The Conversation Extraction feature in Roo-Code provides powerful capabilities for exporting, cleaning, and processing task histories. Through its multi-stage pipeline, pattern-based filtering, and extensible architecture, it enables users to create clean, shareable conversation exports while maintaining privacy and security.

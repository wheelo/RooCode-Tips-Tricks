# Theoretical Enhancement: Smart Content-Aware Sliding Window

## Overview

Roo-Code's current sliding window implementation uses a straightforward truncation approach that removes entire older messages while preserving the system prompt. This document proposes a theoretical enhancement using content-aware compression techniques inspired by the handoff system's conversation extraction methodology.

## Current Implementation

The current sliding window approach in `src/core/sliding-window/index.ts` implements a simple truncation strategy:

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

Key characteristics:
- Always preserves the first message (system prompt)
- Removes a fraction of older messages entirely
- Ensures an even number of messages are removed to maintain user-assistant alternation
- Binary decision: either keeps a message entirely or removes it completely

## Proposed Enhancement: Content-Aware Compression

Instead of removing entire messages, we propose a "middle-out compression" approach that selectively removes less important content within messages while preserving the conversation structure. This approach is inspired by the handoff system's conversation extraction methodology.

### Core Concept

1. Preserve the conversation structure (all message turns)
2. Selectively compress each message by removing:
   - Tool use details while preserving intent
   - File contents and code blocks
   - Redundant content
   - Low-value metadata
3. Apply different compression strategies based on:
   - Message age (older messages get more aggressive compression)
   - Message type (user vs. assistant)
   - Content importance (determined heuristically)

### Implementation Architecture

```typescript
interface ContentCompressionOptions {
  aggressionLevel: number;          // 0-1, higher = more compression
  preserveThinking: boolean;        // Keep assistant's thinking sections
  preserveToolIntents: boolean;     // Keep tool use intents without details
  preserveCodeBlocks: boolean;      // Keep code snippets
  minimumCompressionRatio: number;  // Target compression ratio
}

export function compressMessage(
  message: Anthropic.Messages.MessageParam,
  options: ContentCompressionOptions
): Anthropic.Messages.MessageParam {
  // Apply content-aware compression to the message
  // Return a compressed version of the message
}

export function smartTruncateConversation(
  messages: Anthropic.Messages.MessageParam[],
  targetTokenCount: number,
  contextWindow: number
): Anthropic.Messages.MessageParam[] {
  // 1. Start with all messages
  let compressedMessages = [...messages];
  
  // 2. Apply increasingly aggressive compression until target is met
  for (let aggressionLevel = 0.1; aggressionLevel <= 1.0; aggressionLevel += 0.1) {
    // Apply more aggressive compression to older messages
    compressedMessages = compressedMessages.map((message, index) => {
      // Skip system prompt (first message)
      if (index === 0) return message;
      
      // Calculate age-based aggression (older = more aggressive)
      const age = (compressedMessages.length - index) / compressedMessages.length;
      const effectiveAggression = aggressionLevel * age;
      
      // Apply compression
      return compressMessage(message, {
        aggressionLevel: effectiveAggression,
        preserveThinking: index >= compressedMessages.length - 4, // Preserve recent thinking
        preserveToolIntents: true,
        preserveCodeBlocks: index >= compressedMessages.length - 6, // Preserve recent code
        minimumCompressionRatio: 0.3
      });
    });
    
    // 3. Check if we've met the target token count
    const estimatedTokens = estimateTokenCount(compressedMessages);
    if (estimatedTokens <= targetTokenCount) {
      break;
    }
    
    // 4. If highest aggression doesn't achieve target, fall back to removing messages
    if (aggressionLevel >= 0.9) {
      return truncateConversation(messages, 0.5); // Fall back to current approach
    }
  }
  
  return compressedMessages;
}
```

### Compression Techniques

Drawing from the handoff system's extraction scripts, we can implement several content-aware compression techniques:

#### 1. Pattern-Based Content Removal

```typescript
// Define regex patterns for content to remove or compress
const PATTERNS = {
  // Environment details to remove
  environmentDetails: /\<environment_details\>.*?\<\/environment_details\>/s,
  
  // File content to remove
  fileContent: /\[read_file for '.*?'\] Result:.*?(?=\n\n|\Z)/s,
  
  // Tool use patterns to simplify
  toolUse: {
    readFile: /\<read_file\>.*?\<\/read_file\>/s,
    writeToFile: /\<write_to_file\>.*?\<\/write_to_file\>/s,
    applyDiff: /\<apply_diff\>.*?\<\/apply_diff\>/s,
    // ... other tools
  },
  
  // Simplify thinking sections but preserve key insights
  thinking: /\<thinking\>(.*?)\<\/thinking\>/s,
  
  // Code blocks to preserve selectively
  codeBlocks: /```[\w]*\n.*?```/s,
  
  // Line numbers to remove
  lineNumbers: /^\s*\d+ \|/m,
};

// Apply patterns to selectively compress content
function compressContent(content: string, aggressionLevel: number): string {
  // Always remove environment details
  content = content.replace(PATTERNS.environmentDetails, '');
  
  // Always remove file content (just keep a reference marker)
  content = content.replace(PATTERNS.fileContent, (match, filePath) => {
    return `[File reference: ${filePath}]`;
  });
  
  // Compress tool uses based on aggression level
  if (aggressionLevel > 0.3) {
    // High aggression: Replace tool uses with markers
    Object.entries(PATTERNS.toolUse).forEach(([toolName, pattern]) => {
      content = content.replace(pattern, `[Used ${toolName}]`);
    });
  } else {
    // Low aggression: Keep more details but remove implementation details
    // Specific toolType-dependent implementation here
  }
  
  // Selectively handle thinking sections
  content = content.replace(PATTERNS.thinking, (match, thinkingContent) => {
    if (aggressionLevel > 0.7) {
      // High aggression: Summarize thinking
      return '[Thinking summary]';
    } else {
      // Remove file content and code blocks from thinking but keep the structure
      const compressedThinking = compressThinkingContent(thinkingContent, aggressionLevel);
      return `<thinking>${compressedThinking}</thinking>`;
    }
  });
  
  // Clean up whitespace and duplicates
  content = removeDuplicates(content);
  content = normalizeWhitespace(content);
  
  return content;
}
```

#### 2. Duplicate Content Removal

Based on the handoff system's approach to remove duplicate paragraphs:

```typescript
function removeDuplicates(content: string): string {
  // Split by paragraph
  const paragraphs = content.split(/\n\n+/);
  
  // Use a set to track seen paragraphs
  const seen = new Set<string>();
  const uniqueParagraphs: string[] = [];
  
  for (const paragraph of paragraphs) {
    // Skip very short paragraphs or empty ones
    if (paragraph.trim().length < 10) {
      uniqueParagraphs.push(paragraph);
      continue;
    }
    
    // Create a simplified version for comparison (lowercase, no spaces)
    const simplified = paragraph.toLowerCase().replace(/\s+/g, '');
    
    // Check if we've seen something very similar
    if (!seen.has(simplified)) {
      seen.add(simplified);
      uniqueParagraphs.push(paragraph);
    }
  }
  
  return uniqueParagraphs.join('\n\n');
}
```

#### 3. Content Summarization

For longer messages, implement a summarization approach:

```typescript
async function summarizeLongContent(content: string, maxTokens: number): Promise<string> {
  if (estimateTokenCount([{ type: "text", text: content }]) <= maxTokens) {
    return content; // Already under token limit
  }
  
  // Extract key elements always worth preserving
  const codeBlocks = extractCodeBlocks(content);
  const toolIntents = extractToolIntents(content);
  
  // Summarize the rest using a rule-based approach
  const summarizedText = applyRuleBasedSummarization(content);
  
  // Alternatively, we could use a small local model for summarization
  // const summarizedText = await localSummarizer.summarize(content, maxTokens);
  
  // Recombine preserved elements with summarized text
  return combineElements(summarizedText, codeBlocks, toolIntents);
}
```

## Integration with Current Architecture

The enhanced sliding window system would integrate with the existing architecture:

```typescript
export async function truncateConversationIfNeeded({
  messages,
  totalTokens,
  contextWindow,
  maxTokens,
  apiHandler,
}: TruncateOptions): Promise<Anthropic.Messages.MessageParam[]> {
  // Calculate the maximum tokens reserved for response
  const reservedTokens = maxTokens || contextWindow * 0.2;

  // Calculate available tokens with buffer
  const allowedTokens = contextWindow * (1 - TOKEN_BUFFER_PERCENTAGE) - reservedTokens;
  
  // Calculate total effective tokens
  const effectiveTokens = totalTokens + await estimateLastMessageTokens(messages, apiHandler);
  
  // Determine if truncation is needed
  if (effectiveTokens <= allowedTokens) {
    return messages; // No need to truncate
  }
  
  // Use smart content-aware truncation
  return smartTruncateConversation(messages, allowedTokens, contextWindow);
}
```

## Performance Considerations

Content-aware compression is more computationally intensive than simple truncation. To mitigate this:

1. **Progressive Compression**: Start with light compression and only increase if needed
2. **Caching**: Cache compression results for messages that haven't changed
3. **Background Processing**: Perform compression in a background thread
4. **Message Aging**: Apply compression to older messages during idle times

```typescript
// Example of a message cache implementation
const messageCompressionCache = new Map<string, Anthropic.Messages.MessageParam>();

function getCachedOrCompressMessage(
  message: Anthropic.Messages.MessageParam,
  options: ContentCompressionOptions
): Anthropic.Messages.MessageParam {
  // Generate a cache key based on message content and options
  const cacheKey = generateCacheKey(message, options);
  
  // Check cache
  if (messageCompressionCache.has(cacheKey)) {
    return messageCompressionCache.get(cacheKey)!;
  }
  
  // Compress the message
  const compressedMessage = compressMessage(message, options);
  
  // Cache the result
  messageCompressionCache.set(cacheKey, compressedMessage);
  
  return compressedMessage;
}
```

## Expected Benefits

1. **Increased Effective Context**: Preserves more of the conversation history by compressing rather than removing
2. **Better Conversation Continuity**: Maintains all interaction turns, preventing lost context
3. **Content-Aware Preservation**: Keeps important elements while removing redundant or less valuable content
4. **Progressive Degradation**: Older messages become more compressed but still retain key information
5. **Adaptive Behavior**: Adjusts compression based on content type and importance

## Potential Challenges

1. **Complexity**: More complex implementation than the current approach
2. **Performance Overhead**: Content analysis requires more processing time
3. **Heuristic Tuning**: Requires calibration of content importance heuristics
4. **Potential Artifacts**: Compressed messages might contain artifacts or lose some coherence

## Implementation Plan

1. **Prototype**: Implement core compression techniques and test on sample conversations
2. **Comparison Testing**: Compare with current truncation approach using standard metrics
3. **Performance Optimization**: Implement caching and background processing
4. **A/B Testing**: Deploy to a subset of users to gather feedback
5. **Refinement**: Tune compression algorithms based on real-world usage data

## Conclusion

The proposed content-aware sliding window enhancement offers a significant improvement over the current truncation-based approach. By intelligently compressing message content rather than removing entire messages, Roo-Code could maintain better conversation continuity while efficiently managing token usage.

This approach adapts techniques from the handoff system's conversation extraction methodology, applying them dynamically to optimize context window usage. The implementation would require additional complexity but could substantially improve the assistant's ability to maintain context in long conversations.
# Experimental Features in Roo-Code: Technical Guide

## Overview

Roo-Code's experimental features system allows users to enable cutting-edge capabilities before they're officially released as stable features. This technical guide documents the implementation details, usage patterns, and advanced considerations for each experimental feature.

## Feature Activation Architecture

Experimental features in Roo-Code are controlled through a configuration system defined in `src/shared/experiments.ts`. The architecture follows a feature flag pattern:

```typescript
// Feature IDs are defined as constants
export const EXPERIMENT_IDS = {
  DIFF_STRATEGY: "experimentalDiffStrategy",
  SEARCH_AND_REPLACE: "search_and_replace",
  INSERT_BLOCK: "insert_content",
  POWER_STEERING: "powerSteering",
  MULTI_SEARCH_AND_REPLACE: "multi_search_and_replace",
} as const

// Each experiment has a configuration
export const experimentConfigsMap: Record<ExperimentKey, ExperimentConfig> = {
  DIFF_STRATEGY: {
    name: "Use experimental unified diff strategy",
    description: "Enable the experimental unified diff strategy...",
    enabled: false,
  },
  // Other experiments...
}
```

Features are checked at runtime using the `isEnabled` function:

```typescript
export const experiments = {
  get: (id: ExperimentKey): ExperimentConfig | undefined => {
    return experimentConfigsMap[id]
  },
  isEnabled: (experimentsConfig: Record<ExperimentId, boolean>, id: ExperimentId): boolean => {
    return experimentsConfig[id] ?? experimentDefault[id]
  },
}
```

## 1. Experimental Unified Diff Strategy

**ID**: `experimentalDiffStrategy`

### Implementation Details

The experimental unified diff strategy (`NewUnifiedDiffStrategy`) is a more sophisticated approach to applying code changes compared to the standard Search/Replace strategy. This implementation is found in `src/core/diff/strategies/new-unified/index.ts`.

#### Key Technical Components:

1. **Hunk Parsing**: Breaks a unified diff into "hunks" (chunks of changes with context)
2. **Fuzzy Matching**: Uses context lines to find the best location for changes even when exact matches aren't found
3. **Recursive Splitting**: Can break large hunks into smaller ones when matching fails
4. **Adaptive Context**: Dynamically adjusts the amount of context to optimize matching

```typescript
// Core algorithm for parsing unified diffs
private parseUnifiedDiff(diff: string): Diff {
  const MAX_CONTEXT_LINES = 6 // Number of context lines to keep
  const lines = diff.split("\n")
  const hunks: Hunk[] = []
  // Implementation details...
}
```

#### Features:

- **Sub-hunk Matching**: If a full hunk fails to match, the strategy tries splitting it into smaller sub-hunks
- **Confidence Scoring**: Uses similarity metrics to ensure changes are applied correctly
- **Enhanced Error Reporting**: Provides detailed diagnostics when matches fail
- **Indentation Preservation**: Automatically preserves code indentation patterns

#### Performance Characteristics:

- Typically requires **2-3x** more processing time than standard strategy
- Better handling of large files with many changes
- More resilient to minor file differences

### Technical Considerations

1. **Confidence Threshold**: The strategy uses a confidence threshold (default: 0.8 or 80%) for matching:

   ```typescript
   constructor(confidenceThreshold: number = 1) {
     this.confidenceThreshold = Math.max(confidenceThreshold, 0.8)
   }
   ```

2. **Context Analysis**: The system analyzes context-to-change ratios to provide smarter errors:

   ```typescript
   const contextLines = hunk.changes.filter((c) => c.type === "context").length
   const totalLines = hunk.changes.length
   const contextRatio = contextLines / totalLines
   ```

3. **Error Diagnostics**: Provides detailed error information including search strategy, context ratio, and matching confidence.

### Activation Flow

When this feature is enabled, the diff strategy selection in `getDiffStrategy()` returns a `NewUnifiedDiffStrategy` instance instead of the default:

```typescript
export function getDiffStrategy(
  model: string,
  fuzzyMatchThreshold?: number,
  experimentalDiffStrategy: boolean = false,
): DiffStrategy {
  if (experimentalDiffStrategy) {
    return new NewUnifiedDiffStrategy(fuzzyMatchThreshold)
  }
  return new SearchReplaceDiffStrategy(fuzzyMatchThreshold)
}
```

## 2. Search and Replace Tool

**ID**: `search_and_replace`

### Implementation Details

The Search and Replace tool provides a more powerful alternative to the basic diff strategy, allowing for matching and replacing text with support for fuzzy matching and multi-line changes. This is implemented in `src/core/diff/strategies/search-replace.ts`.

#### Technical Architecture:

1. **Similarity Calculation**: Uses Levenshtein distance for fuzzy matching:

   ```typescript
   function getSimilarity(original: string, search: string): number {
     // Calculate Levenshtein distance
     const dist = distance(normalizedOriginal, normalizedSearch)
     // Calculate similarity ratio
     return 1 - dist / maxLength
   }
   ```

2. **Middle-Out Search Algorithm**: Searches from the middle of the file outward for better performance:

   ```typescript
   const midPoint = Math.floor((searchStartIndex + searchEndIndex) / 2)
   let leftIndex = midPoint
   let rightIndex = midPoint + 1
   
   // Search outward from the middle within bounds
   while (leftIndex >= searchStartIndex || rightIndex <= searchEndIndex - searchLines.length) {
     // Search logic...
   }
   ```

3. **Indentation Preservation**: Sophisticated algorithm to maintain code formatting:

   ```typescript
   // Calculate the relative indentation level
   const searchBaseLevel = searchBaseIndent.length
   const currentLevel = currentIndent.length
   const relativeLevel = currentLevel - searchBaseLevel
   
   // Determine final indentation
   const finalIndent = relativeLevel < 0
     ? matchedIndent.slice(0, Math.max(0, matchedIndent.length + relativeLevel))
     : matchedIndent + currentIndent.slice(searchBaseLevel)
   ```

#### Features:

- **Fuzzy Matching**: Configurable similarity threshold for finding content
- **Line Range Targeting**: Can target specific line ranges for replacement
- **Format Preservation**: Maintains code formatting and indentation
- **Detailed Diagnostics**: Provides comprehensive error information

### Technical Considerations

1. **Optimal Threshold**: The fuzzy threshold determines how similar content must be for a match:

   ```typescript
   this.fuzzyThreshold = fuzzyThreshold ?? 1.0  // Default to exact matching
   ```

2. **Buffer Lines**: Controls how many lines of context to consider:

   ```typescript
   this.bufferLines = bufferLines ?? BUFFER_LINES  // Default: 20
   ```

3. **Line Endings**: Automatically detects and preserves line endings:

   ```typescript
   const lineEnding = originalContent.includes("\r\n") ? "\r\n" : "\n"
   ```

### Usage in the System

The tool is exposed to the LLM with specific format requirements:

```
<<<<<<< SEARCH
[exact content to find including whitespace]
=======
[new content to replace with]
>>>>>>> REPLACE
```

## 3. Insert Content Tool

**ID**: `insert_content`

### Implementation Details

The Insert Content tool provides a way to add new content at specific line positions without modifying existing content. This is particularly useful for adding new functions, import statements, or documentation. The core implementation is in `src/core/diff/insert-groups.ts`.

#### Technical Architecture:

1. **InsertGroup Interface**: Defines the structure for insertions:

   ```typescript
   export interface InsertGroup {
     index: number      // Line number where content should be inserted
     elements: string[] // Array of lines to insert
   }
   ```

2. **Insertion Algorithm**: Sorts and applies insertions in order:

   ```typescript
   export function insertGroups(original: string[], insertGroups: InsertGroup[]): string[] {
     // Sort groups by index to maintain order
     insertGroups.sort((a, b) => a.index - b.index)
   
     let result: string[] = []
     let lastIndex = 0
   
     insertGroups.forEach(({ index, elements }) => {
       // Add elements from original array up to insertion point
       result.push(...original.slice(lastIndex, index))
       // Add the group of elements
       result.push(...elements)
       lastIndex = index
     })
   
     // Add remaining elements from original array
     result.push(...original.slice(lastIndex))
   
     return result
   }
   ```

#### Features:

- **Multiple Insertions**: Can handle multiple insertion points in a single operation
- **Line-Based Positioning**: Targets specific line numbers
- **Order Preservation**: Maintains correct order when multiple insertions affect the same area
- **Original Content Preservation**: Doesn't modify existing content, only adds new content

### Technical Considerations

1. **Line Indexing**: Uses 0-based indexing internally but exposes as 1-based to users
2. **Insertion Order**: Sorting ensures consistent results regardless of input order
3. **Empty File Handling**: Works correctly with empty files or insertions at the start/end

### Integration Points

The insert content tool integrates with other parts of the system:

1. **Tool Description**: Exposed to the LLM with appropriate guidance
2. **Permissions System**: Can be restricted by mode permissions
3. **Error Handling**: Validation for line numbers and file existence

## 4. Power Steering Mode

**ID**: `powerSteering`

### Implementation Details

Power Steering mode enhances the LLM's adherence to role definitions and instructions by including additional context in system prompts. This is particularly useful for complex tasks that require strict adherence to guidelines.

#### Features:

- **Enhanced Role Reminders**: Includes more frequent references to the current mode's role definition
- **Instruction Reinforcement**: Repeats key instructions more frequently
- **Context Window Optimization**: Balances added context with available token space

### Technical Considerations

1. **Token Usage**: Increases token consumption due to repeated context
2. **Performance Impact**: May affect response speed due to larger prompts
3. **Model Behavior**: Generally leads to more consistent but potentially more verbose responses

### Usage Recommendations

Power Steering is most beneficial for:

- Complex collaborative projects with strict guidelines
- Regulated domains with compliance requirements
- Situations where deviation from instructions would be problematic

## 5. Multi-Block Search and Replace

**ID**: `multi_search_and_replace`

### Implementation Details

The Multi-Block Search and Replace feature extends the capabilities of the standard search and replace functionality by allowing multiple code blocks to be updated in a single operation. This is particularly valuable for making consistent changes across different parts of a file.

#### Key Technical Components:

1. **Block Identification**: Identifies multiple distinct blocks within a file that need changes
2. **Parallel Processing**: Processes multiple search/replace operations simultaneously
3. **Change Coordination**: Ensures changes don't conflict with each other
4. **Context Preservation**: Maintains proper context around each modified block

```typescript
// Implementation example for processing multiple blocks
function processMultipleBlocks(
  originalContent: string,
  blocks: SearchReplaceBlock[]
): { content: string; changes: ChangeDetails[] } {
  // Sort blocks by position to process from bottom to top
  // (avoids offset issues when multiple blocks change)
  const sortedBlocks = [...blocks].sort((a, b) =>
    b.startLine - a.startLine
  )
  
  let content = originalContent
  const changes = []
  
  // Process each block independently
  for (const block of sortedBlocks) {
    const result = processSearchReplaceBlock(content, block)
    content = result.content
    changes.push(result.change)
  }
  
  return { content, changes }
}
```

#### Features:

- **Consistent Updates**: Apply the same pattern changes across multiple locations
- **Bulk Operations**: Apply different changes to multiple blocks in one operation
- **Conflict Resolution**: Smart handling of potentially overlapping changes
- **Atomic Updates**: All changes succeed or fail together, preventing partial updates

#### Performance Characteristics:

- Reduces the number of separate operations needed for multi-block files
- Typically 2-3x faster than applying individual changes for files with multiple change points
- More deterministic results compared to sequential modifications

### Technical Considerations

1. **Block Ordering**: Changes are applied from bottom to top to preserve line numbering:

   ```typescript
   // Sort to process changes from bottom to top
   blocks.sort((a, b) => b.startPosition - a.startPosition)
   ```

2. **Conflict Detection**: The system detects and prevents conflicting changes:

   ```typescript
   function detectConflicts(blocks: SearchReplaceBlock[]): boolean {
     // Check for overlapping blocks
     for (let i = 0; i < blocks.length; i++) {
       for (let j = i + 1; j < blocks.length; j++) {
         if (blocksOverlap(blocks[i], blocks[j])) {
           return true
         }
       }
     }
     return false
   }
   ```

3. **Error Handling**: If any block fails to apply, the entire operation is rolled back:

   ```typescript
   try {
     // Process all blocks
     for (const block of blocks) {
       applyChange(block)
     }
     commitChanges()
   } catch (error) {
     rollbackChanges()
     throw new MultiBlockError("Failed to apply multi-block changes", error)
   }
   ```

### Usage in the System

The multi-block tool provides a more powerful interface for complex file modifications:

```
<search_and_replace>
<path>src/component.tsx</path>
<operations>[
  {
    "search": "function Component() {",
    "replace": "function Component(props: ComponentProps) {",
    "start_line": 10,
    "end_line": 10
  },
  {
    "search": "return <div>",
    "replace": "return <div className={props.className}>",
    "start_line": 15,
    "end_line": 15
  }
]</operations>
</search_and_replace>
```

## Technical Implementation of Feature Flags

The experiment system uses a combination of runtime checks and configuration persistence:

1. **State Management**: Flags are stored in VSCode's globalState
2. **UI Representation**: Each flag has a corresponding UI element in settings
3. **Runtime Access**: Accessed via the experiments object:

   ```typescript
   if (experiments.isEnabled(experimentsConfig, EXPERIMENT_IDS.DIFF_STRATEGY)) {
     // Use experimental feature
   } else {
     // Use standard implementation
   }
   ```

## Performance Impact Analysis

| Feature | CPU Impact | Memory Impact | Token Usage Impact |
|---------|------------|---------------|-------------------|
| Unified Diff Strategy | Medium-High | Medium | Low |
| Search and Replace | Medium | Low | Low |
| Insert Content | Low | Low | Low |
| Power Steering | Low | Low | High |
| Multi-Block Search and Replace | Medium | Medium | Low |

## Error Handling and Diagnostics

Each experimental feature includes enhanced error reporting:

1. **Contextual Diagnostics**: Provides information about the specific failure
2. **Troubleshooting Guidance**: Suggests possible solutions
3. **Debug Information**: Includes technical details for diagnosis

Example from unified diff strategy:

```typescript
let errorMsg = `Failed to find a matching location in the file (${Math.floor(
  confidence * 100,
)}% confidence, needs ${Math.floor(this.confidenceThreshold * 100)}%)\n\n`
errorMsg += "Debug Info:\n"
errorMsg += `- Search Strategy Used: ${strategy}\n`
errorMsg += `- Context Lines: ${contextLines} out of ${totalLines} total lines (${Math.floor(
  contextRatio * 100,
)}%)\n`
```

## Custom Integration Examples

### 1. Combining Multiple Experimental Features

The experimental features can be used together for enhanced capabilities:

```typescript
// Example of using unified diff with power steering
if (experiments.isEnabled(experimentsConfig, EXPERIMENT_IDS.DIFF_STRATEGY) && 
    experiments.isEnabled(experimentsConfig, EXPERIMENT_IDS.POWER_STEERING)) {
  // Enhanced instruction adherence with improved diff handling
}
```

### 2. Project-Specific Configuration

Create project-specific experimental feature configurations:

```json
// .vscode/settings.json
{
  "roo-cline.experiments": {
    "experimentalDiffStrategy": true,
    "insert_content": true,
    "search_and_replace": false,
    "powerSteering": false
  }
}
```

### 3. Task-Specific Activation

Activate features only for specific tasks:

```typescript
// Activate experimental feature for specific file types
if (filePath.endsWith('.ts') && 
    experiments.isEnabled(experimentsConfig, EXPERIMENT_IDS.SEARCH_AND_REPLACE)) {
  // Use experimental search and replace for TypeScript files
}
```

## Best Practices for Experimental Features
### When to Enable

1. **Unified Diff Strategy**: Enable when working with large files or complex code changes that require precise matching. Most beneficial for refactoring operations affecting multiple areas of a file.

2. **Search and Replace**: Enable when you need to perform systematic replacements across files, such as updating API calls, renaming variables consistently, or modifying code patterns.

3. **Insert Content**: Enable when adding new functions, methods, imports, or documentation blocks to files without modifying existing content. Particularly useful for codebase extension.

4. **Power Steering**: Enable when working on tasks that require strict adherence to guidelines, such as regulated code, security-sensitive implementations, or team projects with strict conventions.

5. **Multi-Block Search and Replace**: Enable when performing refactorings that require coordinated changes to multiple parts of a file. Especially valuable for updating component signatures, changing function parameters, or implementing consistent API changes throughout a file.
4. **Power Steering**: Enable when working on tasks that require strict adherence to guidelines, such as regulated code, security-sensitive implementations, or team projects with strict conventions.

### Testing Approach

1. **Incremental Testing**: Start with small, isolated changes to evaluate feature behavior
2. **Backup Critical Files**: Create backups before applying changes to important files
3. **Review Results Carefully**: Closely examine the results of each operation
4. **Comparative Testing**: Compare results with and without the experimental feature

### When to Disable

1. **Performance Issues**: If you notice significant slowdowns or increased latency
2. **Unexpected Results**: If changes aren't being applied as expected
3. **Token Consumption**: If you're concerned about token usage (especially for Power Steering)
4. **Before Updates**: Disable experimental features before updating Roo-Code to avoid conflicts

## Future Development Roadmap

Experimental features follow this general progression:

1. **Experimental Phase**: Initial implementation with feature flag
2. **Refinement Phase**: Improvements based on user feedback
3. **Stabilization Phase**: Bug fixes and performance optimization
4. **General Availability**: Removal of feature flag, included in standard features

Current development priorities:

1. **Unified Diff Strategy 2.0**: Enhanced context recognition and improved performance
2. **Insert Content Extensions**: Template-based insertions and smart positioning
3. **Multi-File Search and Replace**: Apply consistent changes across multiple files
4. **Multi-Block Search and Replace Enhancements**: Improved conflict resolution and visual diffing
5. **Adaptive Power Steering**: Context-aware instruction emphasis

## Conclusion

Experimental features provide early access to advanced capabilities in Roo-Code. By understanding their technical implementation and appropriate use cases, you can leverage these features to enhance your workflow while being mindful of their limitations and performance impacts.
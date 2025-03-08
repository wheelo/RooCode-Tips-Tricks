# Task Management in Roo-Code: Technical Guide

## Overview

The task management system in Roo-Code provides a sophisticated mechanism for creating, tracking, and switching between discrete AI-assisted tasks. This technical guide explores the implementation details, API integration, and advanced capabilities of the task management system.

## Core Architecture

### Task Definition and Model

At its core, a task in Roo-Code represents a single conversation thread with its own context, history, and state:

```typescript
export interface HistoryItem {
  id: string       // Unique identifier for the task
  mode: string     // The mode used for this task (e.g., "code", "ask", "architect")
  task: string     // The initial task description or prompt
  ts: number       // Timestamp when the task was created
  // Other properties may include conversation state, completion status, etc.
}
```

Tasks are persisted through VSCode's extension storage API:

```typescript
// Get task history
const taskHistory = ((await this.getGlobalState("taskHistory")) as HistoryItem[]) || []

// Update task history
await this.updateGlobalState("taskHistory", updatedTaskHistory)
```

### Task Lifecycle Management

The task lifecycle is managed primarily by the `ClineProvider` class, which handles:

1. **Creation**: Starting new tasks with optional initial messages and images
2. **Execution**: Processing user inputs and model responses
3. **Tracking**: Maintaining task history and state
4. **Completion**: Finalizing tasks and capturing outcomes
5. **Switching**: Transitioning between different tasks

Key implementation in `ClineProvider.ts`:

```typescript
async initClineWithTask(task?: string, images?: string[]): Promise<void> {
  // Initializing new instance of Cline ensures any agentically running 
  // promises in old instance don't affect the new task
  this.cline = new Cline(
    /* initialization parameters */
  )
  
  // Additional initialization steps
  // ...
}

async clearTask(): Promise<void> {
  // Clear current task and prepare for a new one
  // ...
}
```

## The `new_task` Tool Implementation

The `new_task` tool provides a mechanism for the LLM to create new tasks programmatically. This is implemented in the core prompting system:

```typescript
// From src/core/prompts/tools/new-task.ts
return `## new_task
Description: Create a new task with a specified starting mode and initial message. This tool instructs the system to create a new Cline instance in the given mode with the provided message.

Parameters:
- mode: (required) The slug of the mode to start the new task in (e.g., "code", "ask", "architect").
- message: (required) The initial user message or instructions for this new task.

Usage:
<new_task>
<mode>your-mode-slug-here</mode>
<message>Your initial instructions here</message>
</new_task>

Example:
<new_task>
<mode>code</mode>
<message>Implement a new feature for the application.</message>
</new_task>`
```

The tool is processed within the Cline class, which handles the transition:

```typescript
// Simplified implementation from src/core/Cline.ts
case "new_task": {
  try {
    const mode = block.params.mode
    const message = block.params.message
    
    // Validate mode exists
    const targetMode = await this.providerRef.deref()?.getMode(mode)
    
    if (targetMode) {
      // Switch mode first, then create new task instance
      const provider = this.providerRef.deref()
      await provider?.switchMode(mode)
      await provider?.startNewTask(message)
      
      pushToolResult(
        `Successfully created new task in ${targetMode.name} mode with message: ${message}`,
      )
    } else {
      pushToolResult(
        formatResponse.toolError(`Failed to create new task: mode '${mode}' not found`),
      )
    }
  } catch (error) {
    await handleError("creating new task", error)
  }
  break
}
```

## Task Storage and Persistence

Tasks are stored in VSCode's extension global state, allowing them to persist across sessions:

```typescript
// Save a new task to history
const newTask: HistoryItem = {
  id: generateUUID(),
  mode: currentMode,
  task: initialMessage,
  ts: Date.now()
}

const taskHistory = ((await this.getGlobalState("taskHistory")) as HistoryItem[]) || []
await this.updateGlobalState("taskHistory", [newTask, ...taskHistory])

// Retrieve task history, sorted by timestamp
const history = taskHistory
  .filter((item: HistoryItem) => item.ts && item.task)
  .sort((a: HistoryItem, b: HistoryItem) => b.ts - a.ts)
```

## Task Context Isolation

Each task maintains its own isolated context to prevent cross-contamination:

1. **Conversation History**: Each task has its own conversation thread
2. **Mode Context**: Tasks can operate in different modes with different capabilities
3. **API State**: API conversation state is isolated between tasks
4. **Tool History**: Tool use history is specific to each task

This isolation is implemented through the creation of a new Cline instance for each task:

```typescript
// Initializing new instance of Cline will make sure that any agentically running promises 
// in old instance don't affect our new task. This essentially creates a fresh slate.
await this.initClineWithTask(message.text, message.images)
```

## Mode Integration

The task management system integrates deeply with Roo-Code's mode system, allowing tasks to be mode-specific:

1. **Mode-Specific Tasks**: Tasks can be created within specific modes (code, ask, architect, etc.)
2. **Mode Switching**: The `new_task` tool supports mode switching during task creation
3. **Permission Inheritance**: Tasks inherit the permission structure of their mode

```typescript
// Mode permissions are applied during task creation
const modePermissions = this.getModePermissions(mode)
this.cline = new Cline(
  // Other parameters...
  modePermissions,
  // More parameters...
)
```
## Integration with MCP Servers

The task management system integrates with the Model Context Protocol (MCP) server framework, providing task-specific access to external tools and resources:

```typescript
// MCP integration in task initialization
async initializeWithMcpContext(): Promise<void> {
  // Initialize MCP connections for this specific task
  if (this.mcpHub) {
    await this.mcpHub.initialize()
    
    // Track tools and resources available for this task
    this.mcpTools = await this.mcpHub.getAllTools()
    this.mcpResources = await this.mcpHub.getAllResources()
    
    // Configure MCP permissions for the task
    await this.configureMcpPermissions(this.currentMode)
  }
}
```

Each task maintains its own isolated view of:
- Available MCP servers
- Permitted tools and resources
- Server connection state
- Authorization settings

This ensures complete isolation between tasks even when they interact with the same MCP servers.

## Task Tagging and Organization

Tasks can be tagged and organized for easier management through metadata:

```typescript
// Enhanced HistoryItem interface with tagging support
export interface HistoryItem {
  id: string
  mode: string
  task: string
  ts: number
  
  // Task organization metadata
  tags?: {
    project?: string
    category?: string
    priority?: 'high' | 'medium' | 'low'
    status?: 'in-progress' | 'completed' | 'paused'
    custom?: Record<string, string>
  }
}

// Adding tags to a task
async addTagsToTask(taskId: string, tags: Partial<TaskTags>): Promise<void> {
  const taskHistory = ((await this.getGlobalState("taskHistory")) as HistoryItem[]) || []
  const taskIndex = taskHistory.findIndex(item => item.id === taskId)
  
  if (taskIndex >= 0) {
    taskHistory[taskIndex].tags = { ...taskHistory[taskIndex].tags, ...tags }
    await this.updateGlobalState("taskHistory", taskHistory)
  }
}
```

This tagging system allows for more sophisticated task organization and filtering capabilities.

## Task Completion

Tasks can be completed in multiple ways:

1. **Automatic Completion**: When the LLM determines a task is complete and uses the `attempt_completion` tool
2. **User Termination**: When the user ends the conversation or starts a new task
3. **Timeout**: Through inactivity timeouts (if configured)
3. **Timeout**: Through inactivity timeouts (if configured)

Completed tasks remain in history and can be referenced or restarted:

```typescript
// After task completion
const response = await this.ask("completion_result", resultToSend)
if (response === "yesButtonClicked") {
  // User accepted completion
  // ...
} else if (response === "noButtonClicked") {
  // User rejected completion, continue conversation
  // ...
}
```

## WebView Integration

The task management system is integrated with the WebView UI:

1. **Task Creation UI**: Interface for starting new tasks
2. **Task History View**: List of previous tasks that can be resumed
3. **Completion UI**: Interface for accepting/rejecting task completion
4. **Task Switching**: UI elements for switching between tasks

```typescript
// Start a new task from WebView
case "newTask":
  // initializing new instance of Cline will make sure that any agentically running
  // promises in old instance don't affect our new task.
  await this.initClineWithTask(message.text, message.images)
  break
```

## Auto-Approval System

The `autoApproveTaskCreation` setting controls whether task creation requires user approval:

```typescript
// From extension state
export interface ExtensionState {
  // Other settings...
  autoApproveTaskCreation: boolean
  // More settings...
}
```

When enabled, the LLM can create new tasks without user confirmation:

```typescript
if (this.autoApproveTaskCreation) {
  // Automatically approve task creation
  await this.providerRef.deref()?.switchMode(mode)
  await this.providerRef.deref()?.startNewTask(message)
} else {
  // Request user approval
  const { response } = await this.ask("new_task_approval", { mode, message })
  if (response === "yesButtonClicked") {
    // User approved
    await this.providerRef.deref()?.switchMode(mode)
    await this.providerRef.deref()?.startNewTask(message)
  }
}
```

## Advanced Task Management Features

### 1. Task History Browser

```typescript
// Example implementation of task history browser
function renderTaskHistory(history: HistoryItem[]): JSX.Element {
  return (
    <div className="task-history">
      {history.map((item) => (
        <div 
          key={item.id} 
          className="task-history-item" 
          onClick={() => resumeTask(item.id)}
        >
          <span className="mode-badge">{item.mode}</span>
          <span className="task-description">{item.task}</span>
          <span className="task-date">{formatDate(item.ts)}</span>
        </div>
      ))}
    </div>
  )
}
```

### 2. Code Actions Integration

The task management system integrates with VSCode's code actions to create task-specific operations:

```typescript
// Register task-specific code actions
vscode.languages.registerCodeActionsProvider(
  { pattern: "**/*" },
  new CodeActionProvider(),
  {
    providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds
  }
)

// Example of starting a new task from a code action
export function registerCodeAction(
  context: vscode.ExtensionContext,
  baseCommand: string,
  promptType: string,
  inputPrompt: string,
  inputPlaceholder?: string
) {
  // Register new task version
  context.subscriptions.push(
    vscode.commands.registerCommand(`${baseCommand}.newTask`, async () => {
      // Implementation details
      // ...
      await sidebarProvider.clearTask()
      await sidebarProvider.startNewTask(prompt)
    })
  )
}
```

### 3. Terminal Actions Integration

The task management system also integrates with terminal actions:

```typescript
// Register terminal action that creates a new task
export function registerTerminalAction(
  context: vscode.ExtensionContext,
  terminalManager: TerminalManager,
  baseCommand: string,
  promptType: string,
  inputPrompt: string
) {
  // Register new task version
  context.subscriptions.push(
    vscode.commands.registerCommand(`${baseCommand}.terminal.newTask`, async () => {
      // Implementation details
      // ...
      await sidebarProvider.startNewTask(prompt)
    })
  )
}
```

## API Design for Extensions

The task management system exposes a public API for extensions to interact with:

```typescript
// Public API
export interface ClineExtensionApi {
  // Start a new task with an optional initial message and images
  startNewTask(task?: string, images?: string[]): Promise<void>
  
  // Clear the current task and prepare for a new one
  clearTask(): Promise<void>
  
  // Get the history of tasks
  getTaskHistory(): Promise<HistoryItem[]>
  
  // Resume a previously created task
  resumeTask(taskId: string): Promise<void>
}
```

Example usage:

```typescript
// Example of using the public API
async function exampleUsage() {
  // Get the Cline API
  const cline = await vscode.extensions.getExtension('rooveterinaryinc.roo-cline')?.activate()
  
  // Start a new task with an initial message
  await cline.startNewTask("Hello, Cline! Let's make a new project...")
  
  // Start a new task with an initial message and images
  await cline.startNewTask("Use this design language", ["data:image/webp;base64,..."])
}
```

## Best Practices for Task Management

### 1. Task Granularity

Best practices for determining appropriate task scope:
- Focus each task on a specific, coherent goal
- Break complex problems into multiple related tasks
- Consider mode-specific requirements when defining tasks

### 2. Task Organization

Approaches for organizing related tasks:
- Use descriptive task names that clearly indicate purpose
- Create task chains for multi-stage processes
- Maintain consistent naming conventions

### 3. Task Context Management

Optimize context management across tasks:
- Reference relevant information from previous tasks
- Use mentions to include specific artifacts
- Provide summary context when switching between related tasks

## Future Development Roadmap

Planned enhancements to the task management system include several advanced capabilities:

1. **Task Dependencies and Workflows**: Define formal relationships between tasks with prerequisite chains and conditional branching:
   ```typescript
   interface TaskDependency {
     dependsOn: string[]  // Array of task IDs that must be completed first
     condition?: string   // Optional condition for when this dependency applies
     priority: number     // Execution priority (lower numbers execute first)
   }
   ```

2. **Workspace-Specific Task History**: Scope task history to workspaces with improved isolation and context-awareness:
   ```typescript
   // Store tasks with workspace context
   const workspaceTask: WorkspaceHistoryItem = {
     ...newTask,
     workspaceId: this.activeWorkspace.id,
     workspacePath: this.activeWorkspace.rootPath,
     workspaceContext: await this.generateWorkspaceContext()
   }
   ```

3. **Task Templates**: Predefined task structures for common workflows with parameterization:
   ```typescript
   interface TaskTemplate {
     id: string
     name: string
     description: string
     parameterSchema: JSONSchema7  // JSON Schema for template parameters
     modeSlug: string
     promptTemplate: string        // Template with parameter placeholders
     suggestedFollowup?: TaskTemplate[] // Suggested next templates
   }
   ```

4. **Enhanced Task Sharing**: Export and import tasks with full context preservation:
   ```typescript
   async exportTaskWithResources(taskId: string): Promise<TaskExport> {
     // Export task with all related resources, conversation history,
     // relevant file snippets, and execution context
   }
   ```

5. **Advanced Task Analytics**: Comprehensive metrics and insights about task performance and resource usage:
   ```typescript
   interface TaskAnalytics {
     completionRate: number
     avgCompletionTime: number
     tokenUsage: {
       input: number
       output: number
       byModel: Record<string, number>
     }
     toolUsage: Record<string, number>
     errorRate: number
     userInteractions: number
   }
   ```

6. **Task Continuity Across Sessions**: Improved handling of long-running tasks across VSCode sessions:
   ```typescript
   interface PersistentTaskState {
     id: string
     execution: {
       phase: string
       progress: number
       estimatedTimeRemaining?: number
       checkpoints: TaskCheckpoint[]
     }
     resources: {
       openFiles: string[]
       activeTerminals: TerminalState[]
       browserState?: BrowserSessionState
     }
   }
   ```

7. **Cross-Task Knowledge Transfer**: Mechanisms for tasks to share knowledge and context in a controlled manner:
   ```typescript
   async shareTaskContext(sourceTaskId: string, targetTaskId: string, contextSelector: ContextSelector): Promise<void> {
     // Transfer selective context from one task to another
     // while maintaining proper isolation boundaries
   }
   ```

## Conclusion

The task management system in Roo-Code provides a robust foundation for organizing and executing AI-assisted work. By understanding the technical implementation and integrating with the provided APIs, developers can create sophisticated workflows that leverage the system's capabilities while maintaining clear separation between different contexts and goals.
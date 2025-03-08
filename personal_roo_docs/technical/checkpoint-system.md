# Checkpoint System in Roo-Code: Technical Guide

## Overview

The Checkpoint System in Roo-Code provides an integrated version control mechanism that allows tracking, saving, and restoring workspace states during task execution. This technical guide documents the architecture, implementation details, and integration points of the checkpoint system.

## Architecture

The checkpoint system uses Git as its underlying version control mechanism, creating shadow repositories to track workspace changes without interfering with the user's existing version control. The system has two main implementation strategies:

1. **Task-Based Checkpoints**: Each task gets its own shadow repository
2. **Workspace-Based Checkpoints**: A single shadow repository per workspace with branches for tasks

### Core Components

```
src/services/checkpoints/
├── ShadowCheckpointService.ts         # Base checkpoint service
├── RepoPerTaskCheckpointService.ts    # Task-based implementation
├── RepoPerWorkspaceCheckpointService.ts # Workspace-based implementation
└── types.ts                           # Type definitions and interfaces
```

### Key Interfaces

```typescript
interface CheckpointEventEmitter extends EventEmitter {
  on(event: "initialize", listener: (data: InitializeEvent) => void): this;
  on(event: "checkpoint", listener: (data: CheckpointEvent) => void): this;
  on(event: "restore", listener: (data: RestoreEvent) => void): this;
  on(event: "error", listener: (data: ErrorEvent) => void): this;
}

interface CheckpointService extends CheckpointEventEmitter {
  readonly taskId: string;
  readonly checkpointsDir: string;
  readonly workspaceDir: string;
  
  initShadowGit(): Promise<void>;
  saveCheckpoint(message: string): Promise<{ commit?: string }>;
  restoreCheckpoint(commitHash: string): Promise<void>;
  getDiff(options: GetDiffOptions): Promise<string[]>;
}
```

## Implementation Details

### Shadow Git Repository

The checkpoint system creates a shadow Git repository separate from any existing Git repositories in the user's workspace:

```typescript
protected async initShadowGit(): Promise<void> {
  await fs.mkdir(this.checkpointsDir, { recursive: true })
  
  const git = simpleGit(this.checkpointsDir)
  const gitVersion = await git.version()
  
  if (await fileExistsAtPath(this.dotGitDir)) {
    // Existing repo, just ensure it's set up correctly
    this.log(`[${this.constructor.name}#initShadowGit] using existing shadow git repo at ${this.checkpointsDir}`)
  } else {
    // Create new repo
    this.log(`[${this.constructor.name}#initShadowGit] creating shadow git repo at ${this.checkpointsDir}`)
    await git.init()
  }
  
  // Set up excludes to prevent Git submodule issues
  await this.setupExcludes()
  
  // Initial commit if needed
  if (!this.baseHash) {
    const status = await git.status()
    if (!status.current) {
      await this.git.add(".")
      const result = await this.git.commit("Initial commit")
      this.baseHash = result.commit || undefined
    }
  }
  
  this.emit("initialize", {
    type: "initialize",
    workspaceDir: this.workspaceDir,
    baseHash: this.baseHash!,
    created: true,
    duration: Date.now() - startTime
  })
}
```

### Saving Checkpoints

The system creates Git commits to save the state of the workspace:

```typescript
public async saveCheckpoint(message: string): Promise<{ commit?: string }> {
  const startTime = Date.now()
  
  try {
    this.log(`[${this.constructor.name}#saveCheckpoint] starting checkpoint save`)
    
    // Add all changes
    await this.git.add(".")
    
    // Create commit
    const result = await this.git.commit(message)
    
    const isFirst = this._checkpoints.length === 0
    const fromHash = this._checkpoints[this._checkpoints.length - 1] ?? this.baseHash!
    const toHash = result.commit || fromHash
    
    // Track checkpoints
    this._checkpoints.push(toHash)
    
    // Emit event
    const duration = Date.now() - startTime
    if (isFirst || result.commit) {
      this.emit("checkpoint", { 
        type: "checkpoint", 
        isFirst, 
        fromHash, 
        toHash, 
        duration 
      })
    }
    
    return result
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    this.log(`[${this.constructor.name}#saveCheckpoint] failed to create checkpoint: ${error.message}`)
    this.emit("error", { type: "error", error })
    return {}
  }
}
```

### Restoring Checkpoints

The system uses Git checkout to restore a previous state:

```typescript
public async restoreCheckpoint(commitHash: string): Promise<void> {
  const startTime = Date.now()
  
  try {
    this.log(`[${this.constructor.name}#restoreCheckpoint] starting checkpoint restore`)
    
    // Checkout the commit
    await this.git.checkout(commitHash)
    
    // Prune checkpoints after this one
    const checkpointIndex = this._checkpoints.indexOf(commitHash)
    if (checkpointIndex !== -1) {
      this._checkpoints = this._checkpoints.slice(0, checkpointIndex + 1)
    }
    
    // Emit event
    const duration = Date.now() - startTime
    this.emit("restore", { type: "restore", commitHash, duration })
    
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    this.log(`[${this.constructor.name}#restoreCheckpoint] failed to restore checkpoint: ${error.message}`)
    this.emit("error", { type: "error", error })
    throw error
  }
}
```

### Showing Diffs

The system provides diff functionality to show changes between checkpoints:

```typescript
public async getDiff(options: GetDiffOptions): Promise<string[]> {
  const { from, to } = options
  
  try {
    // Get diff between commits
    const result = await this.git.diff([from, to])
    
    // Process the diff into a more usable format
    return processDiff(result)
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    this.log(`[${this.constructor.name}#getDiff] failed to get diff: ${error.message}`)
    this.emit("error", { type: "error", error })
    return []
  }
}
```

## Integration with Cline

The checkpoint system is integrated into the core Cline class:

```typescript
// In Cline.ts

// Properties
private enableCheckpoints: boolean
private checkpointStorage: CheckpointStorage
private checkpointService?: RepoPerTaskCheckpointService | RepoPerWorkspaceCheckpointService

// Initialization
constructor(
  // ...other parameters
  enableCheckpoints = true,
  checkpointStorage = "task",
  // ...other parameters
) {
  // ...other initialization
  this.enableCheckpoints = enableCheckpoints
  this.checkpointStorage = checkpointStorage
  // ...other initialization
}

// Methods for checkpoints
private async getCheckpointService(): Promise<
  RepoPerTaskCheckpointService | RepoPerWorkspaceCheckpointService | undefined
> {
  if (!this.enableCheckpoints) {
    return undefined
  }
  
  if (this.checkpointService) {
    return this.checkpointService
  }
  
  try {
    // Initialize the checkpoint service
    const workspaceDir = // Get workspace directory
    const globalStorageDir = // Get global storage directory
    
    if (!workspaceDir || !globalStorageDir) {
      this.enableCheckpoints = false
      return undefined
    }
    
    const options = {
      taskId: this.taskId,
      globalStorageDir,
      workspaceDir,
      log: (message: string) => this.providerRef.deref()?.log(message),
    }
    
    // Create service based on storage type
    const service = this.checkpointStorage === "task"
      ? await RepoPerTaskCheckpointService.create(options)
      : await RepoPerWorkspaceCheckpointService.create(options)
    
    // Setup event handlers
    this.setupCheckpointEventHandlers(service)
    
    // Initialize and save first checkpoint if needed
    await service.initShadowGit()
    this.checkpointService = service
    
    return service
  } catch (error) {
    this.enableCheckpoints = false
    return undefined
  }
}

// Public checkpoint methods
public checkpointSave() {
  const service = this.getCheckpointService()
  if (!service) return
  
  service.saveCheckpoint(`Task: ${this.taskId}, Time: ${Date.now()}`)
    .catch(error => {
      this.enableCheckpoints = false
    })
}

public async checkpointDiff({ ts, from, to, mode }) {
  try {
    const service = await this.getCheckpointService()
    if (!service) throw new Error("Checkpoints not available")
    
    // Get diff between commits
    const changes = await service.getDiff({ from, to })
    
    // Send diff to UI
    this.say(
      "vscode.changes",
      mode === "full" ? "Changes since task started" : "Changes since previous checkpoint",
      changes.map(change => [/* format changes */])
    )
  } catch (error) {
    this.enableCheckpoints = false
  }
}

public async checkpointRestore({ ts, commitHash }) {
  try {
    const service = await this.getCheckpointService()
    if (!service) throw new Error("Checkpoints not available")
    
    // Restore to specified commit
    await service.restoreCheckpoint(commitHash)
  } catch (error) {
    this.enableCheckpoints = false
  }
}
```

## UI Integration

The checkpoint system integrates with the VSCode webview interface:

```typescript
// In ClineProvider.ts
handleMessage(message: WebviewMessage) {
  switch (message.command) {
    // ...other commands
    
    case "checkpointDiff":
      const result = checkoutDiffPayloadSchema.safeParse(message.payload)
      if (result.success) {
        await this.getCurrentCline()?.checkpointDiff(result.data)
      }
      break
      
    case "checkpointRestore": {
      const result = checkoutRestorePayloadSchema.safeParse(message.payload)
      if (result.success) {
        await this.getCurrentCline()?.checkpointRestore(result.data)
      }
      break
    }
    
    case "checkpointStorage":
      const checkpointStorage = message.text ?? "task"
      await this.updateGlobalState("checkpointStorage", checkpointStorage)
      await this.postStateToWebview()
      break
      
    // ...other commands
  }
}
```

## Automatic Checkpoint Creation

The system automatically creates checkpoints after certain operations:

```typescript
private async initiateTaskLoop(userContent: UserContent): Promise<void> {
  // ...other code
  
  // Kicks off the checkpoints initialization process in the background.
  this.getCheckpointService()
  
  // ...other code
  
  // Flag used to track whether a tool that may have changed files was used
  let isCheckpointPossible = false
  
  // After tool use that may modify files
  if (isToolThatModifiesFiles) {
    isCheckpointPossible = true
  }
  
  // Create a checkpoint if needed
  if (isCheckpointPossible) {
    this.checkpointSave()
  }
}
```

## Configuration Options

The checkpoint system supports several configuration options:

```typescript
// In shared/globalState.ts
export type CheckpointStorage = "task" | "workspace"

// In shared/ExtensionMessage.ts
export interface ClientOptions {
  // ...other options
  enableCheckpoints: boolean
  checkpointStorage: CheckpointStorage
  // ...other options
}
```

## Storage Considerations

### Task-Based Storage

```typescript
// In RepoPerTaskCheckpointService.ts
protected static taskRepoDir({ taskId, globalStorageDir }: { taskId: string; globalStorageDir: string }) {
  return path.join(globalStorageDir, "tasks", taskId, "checkpoints")
}
```

### Workspace-Based Storage

```typescript
// In RepoPerWorkspaceCheckpointService.ts
protected static workspaceRepoDir({ globalStorageDir, workspaceDir }: { globalStorageDir: string; workspaceDir: string }) {
  return path.join(globalStorageDir, "checkpoints", this.hashWorkspaceDir(workspaceDir))
}
```

## Checkpoint Events

The system emits events for checkpoint operations:

```typescript
// Base events
interface CheckpointBaseEvent {
  type: string;
}

// Initialize event
interface InitializeEvent extends CheckpointBaseEvent {
  type: "initialize";
  workspaceDir: string;
  baseHash: string;
  created: boolean;
  duration: number;
}

// Checkpoint event
interface CheckpointEvent extends CheckpointBaseEvent {
  type: "checkpoint";
  isFirst: boolean;
  fromHash: string;
  toHash: string;
  duration: number;
}

// Restore event
interface RestoreEvent extends CheckpointBaseEvent {
  type: "restore";
  commitHash: string;
  duration: number;
}

// Error event
interface ErrorEvent extends CheckpointBaseEvent {
  type: "error";
  error: Error;
}
```

## Error Handling

The checkpoint system includes robust error handling:

```typescript
try {
  // Checkpoint operation
} catch (e) {
  const error = e instanceof Error ? e : new Error(String(e))
  this.log(`[${this.constructor.name}#methodName] error message: ${error.message}`)
  this.emit("error", { type: "error", error })
  
  // Disable checkpoints on critical errors
  this.enableCheckpoints = false
}
```

## Performance Considerations

1. **Shadow Repository Isolation**: The shadow repository is isolated from the user's actual Git repository
2. **Asynchronous Operations**: All Git operations run asynchronously
3. **Intelligent Checkpoint Creation**: Checkpoints are only created when changes are detected
4. **Storage Options**: Users can choose between task-based or workspace-based storage

## Conclusion

The Checkpoint System in Roo-Code provides a powerful mechanism for tracking workspace state during task execution. By leveraging Git's proven version control capabilities and adding a layer of abstraction, the system allows seamless saving and restoring of workspace states, enhancing the user experience when working with complex tasks.
# Task Management in Roo-Code

## What Are Tasks?

Tasks in Roo-Code let you organize different conversations with Roo. Each task is like a separate chat thread with its own context and purpose. This helps you:

- Work on multiple projects without confusion
- Keep conversations organized by purpose
- Switch between different activities easily

## Working with Tasks

### Creating a New Task

You can create a new task in several ways:

1. **Click the "New Task" button** in the Roo sidebar
2. **Use the command palette**: `Ctrl+Shift+P` and type "Roo: New Task"
3. **Ask Roo to create a task**: "Could you start a new task to help me with..."

Each new task starts fresh, with no context from previous conversations.

### Switching Between Tasks

To switch between existing tasks:

1. Click the task switcher dropdown in the Roo sidebar
2. Select the task you want to resume
3. Your conversation will continue where you left off

### Task History

Roo keeps a history of your tasks, which you can access from the sidebar. Tasks are organized by:

- Creation date
- Task name (based on your initial request)
- Mode used (Code, Ask, Architect, etc.)

## Task Modes

Each task runs in a specific "mode" that defines what Roo can do:

| Mode | Purpose | Best for |
|------|---------|----------|
| Code | Full access to coding tools | Writing and editing code |
| Ask | Answer questions, limited editing | Learning and information |
| Architect | Planning and design | Project planning and architecture |
| Debug | Troubleshooting issues | Finding and fixing bugs |

You can switch a task's mode at any time, or Roo might suggest switching modes if it would be more appropriate for your current goal.

## Task Organization Features

### Task Tagging

You can organize tasks with tags:

- **Project**: Group tasks by project name
- **Category**: Categorize by purpose (e.g., "feature", "bugfix")
- **Priority**: Set importance level
- **Status**: Track progress state

For example: "Tag this task as part of the login-feature project with high priority."

### Context Isolation

Each task maintains its own context:

- Chat history is specific to each task
- Tool usage history stays with its task
- File operations are tracked separately

This isolation means you can work on multiple aspects of your project without confusion.

## Using the new_task Tool

Roo can create new tasks programmatically using the `new_task` tool. This is useful when:

- Roo suggests breaking down complex work into smaller tasks
- You want to switch modes for a new phase of work
- You're creating a sequence of related tasks

Example: "Could you create a new task in Architect mode to design the database schema for our project?"

## Task Completion

Tasks can be completed in several ways:

1. **Automatic completion**: When Roo determines it has accomplished your goal
2. **Manual ending**: When you start a new task or close the conversation
3. **Explicit completion**: When you tell Roo the task is finished

Completed tasks remain in your history and can be resumed later if needed.

## Task Integration with MCP Servers

Tasks integrate with Model Context Protocol (MCP) servers, which provide additional tools and resources:

- Each task has its own MCP server connections
- Server tools and resources are available within the task
- Authorization settings are task-specific

## Best Practices

### Effective Task Structure

1. **One purpose per task**: Keep tasks focused on a single objective
2. **Clear naming**: Start with a descriptive request to name your task well
3. **Right mode selection**: Choose the appropriate mode for your task
4. **Task sequences**: Use related tasks for multi-stage work

### When to Create New Tasks

Create new tasks when:
- Switching to a completely different topic
- Starting a new phase of work
- Context window is getting full (70%+ usage)
- Current conversation has become too long or complex

### When to Continue Existing Tasks

Continue using an existing task when:
- Following up on previous work
- The context from earlier in the conversation is still relevant
- You're working on the same specific goal

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Task missing from history | Check if it was created in a different workspace |
| Context lost between tasks | Use @mentions to reference important files |
| Too many tasks to manage | Use tags to organize and categorize tasks |
| Task creation fails | Ensure you're not exceeding resource limits |


# Using Checkpoints in Roo-Code

## What Are Checkpoints?

Checkpoints are snapshots of your workspace that Roo automatically creates as you work together. They're like save points in a game, allowing you to:

- Track changes to your files over time
- Go back to previous versions if needed
- See what changes were made between saves
- Experiment freely, knowing you can restore your work

## How Checkpoints Work

When you're working with Roo on a task:

1. **Automatic Saving**: Roo automatically creates checkpoints after important operations that change your files
2. **Safe Storage**: These checkpoints are stored separately from your code and don't interfere with your own version control
3. **Easy Restoration**: You can go back to any checkpoint with a simple click
4. **Change Tracking**: You can see exactly what changed between checkpoints

## Viewing Your Checkpoints

To see your available checkpoints:

1. Look for the "Checkpoints" dropdown in the top right of the Roo interface
2. Click to expand and see a list of all saved checkpoints in the current task
3. Each checkpoint shows when it was created and what changes it contains

## Restoring a Checkpoint

If you need to go back to a previous state:

1. Open the "Checkpoints" dropdown
2. Click on the checkpoint you want to restore
3. Confirm the restoration when prompted
4. Your workspace will return to exactly how it was at that point

## Viewing Changes Between Checkpoints

To see what changed between checkpoints:

1. Open the "Checkpoints" dropdown
2. Select "View Changes" on any checkpoint
3. A diff view will show what files were added, changed, or removed
4. You can click on any file to see the specific line changes

## Checkpoint Storage Options

Roo offers two ways to store checkpoints:

### Task-Based Storage (Default)

- Checkpoints are stored per task
- Each task has its own independent checkpoints
- Checkpoints are deleted when the task is deleted
- Best for most users who work on different tasks

### Workspace-Based Storage

- Checkpoints are stored per workspace
- All tasks in the same workspace share a checkpoint history
- Checkpoints remain even if tasks are deleted
- Best for users who work continuously in the same workspace

To change your storage option:
1. Open Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Roo Checkpoint Storage"
3. Choose either "task" or "workspace"

## Enabling/Disabling Checkpoints

Checkpoints are enabled by default, but you can turn them off:

1. Open Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Roo Enable Checkpoints"
3. Toggle the setting on or off

## Best Practices

### When to Rely on Checkpoints

- During complex refactoring operations
- When making experimental changes
- When Roo is making multiple file changes
- When trying different approaches to a problem

### When Not to Rely on Checkpoints

- For long-term version control (use Git instead)
- For sharing changes with others (use Git instead)
- For permanent backups (checkpoints may be deleted)

### Regular Checkpoint Creation

If you want to manually create a checkpoint at any time:

1. Click the "Create Checkpoint" button in the Roo interface
2. Or use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for "Roo: Create Checkpoint"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Checkpoints not being created | Check that checkpoints are enabled in settings |
| Can't see checkpoint dropdown | Make sure you're in an active Roo task |
| Restoration fails | Make sure no file operations are in progress |
| Can't see changes in diff view | Try selecting a different checkpoint for comparison |

## Privacy and Storage

- Checkpoints are stored locally on your computer
- No checkpoint data is sent to Roo's servers
- Checkpoints use minimal disk space thanks to Git-based storage
- You can delete all checkpoint data by deleting the `.roo` folder in your workspace

## How Checkpoints Differ From Git

While checkpoints use Git technology internally, they're different from your own Git repositories:

- **Automatic**: Created without you having to do anything
- **Task-focused**: Organized around your conversations with Roo
- **Shadow system**: Won't interfere with your existing Git repo
- **UI integrated**: Managed through the Roo interface
- **Short-term**: Designed for your current work, not long-term history

## Coming Soon

Future enhancements to the checkpoint system will include:
- Checkpoint labeling and tagging
- Export/import of checkpoints
- Checkpoint comparison visualizations
- Integration with your Git workflow
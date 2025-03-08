# Export Task History in Roo-Code

## What is Task History Export?

The Task History Export feature allows you to save your conversations with Roo for later reference, sharing, or analysis. This feature cleans up the raw conversation by removing unnecessary technical details, making it easier to read and use.

## When to Use Task History Export

Export your task history when you want to:

- Save important conversations for future reference
- Share solutions with teammates or in documentation
- Create training materials from your interactions
- Document your problem-solving process
- Archive completed projects

## How to Export Your Task History

### Using the Command Palette

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Roo: Export Task History"
3. Select the desired format (Markdown, JSON, or plain text)
4. Choose where to save the exported file

### Using the Roo Interface

1. Click the "⋮" (more options) button in the Roo sidebar
2. Select "Export Task History"
3. Choose your preferred format and cleanup level
4. Select a location to save the file

### Using Keyboard Shortcuts

The default shortcut for exporting the current task is:
- Windows/Linux: `Ctrl+Alt+E`
- Mac: `Cmd+Option+E`

## Export Formats

### Markdown (Default)

Markdown format is great for:
- Reading in documentation tools
- Sharing in GitHub or other markdown-supporting platforms
- Converting to other formats later

Example:
```markdown
**User:**

How do I create a React component with TypeScript?

---

**Assistant:**

Here's how to create a React component with TypeScript:

```tsx
import React from 'react';

interface ButtonProps {
  text: string;
  onClick: () => void;
}

const Button: React.FC<ButtonProps> = ({ text, onClick }) => {
  return (
    <button onClick={onClick}>
      {text}
    </button>
  );
};

export default Button;
```
```

### JSON

JSON format is useful for:
- Programmatic processing
- Importing into other tools
- Data analysis

### Plain Text

Plain text format is best for:
- Maximum compatibility
- Importing into any text editor
- Simple sharing without formatting

## Cleanup Levels

You can control how much processing is applied to your conversation:

### Minimal Cleanup

- Removes environment details
- Keeps most content including code blocks
- Preserves tool uses and results
- Best for detailed technical references

### Moderate Cleanup (Default)

- Removes tool uses while keeping key information
- Keeps code blocks and important details
- Removes redundant content
- Good balance for most purposes

### Aggressive Cleanup

- Removes all tool uses and system information
- Focuses on just the core conversation
- Removes duplicate paragraphs
- Best for sharing with non-technical audiences

## Customizing Export Behavior

You can customize export behavior in Roo-Code settings:

1. Open VS Code settings
2. Search for "Roo Export"
3. Adjust the following settings:
   - Default export format
   - Default cleanup level
   - Whether to include metadata
   - Code block handling

## Including Metadata

When exporting, you can choose to include metadata about your task:

- Task creation time and duration
- Mode used (Code, Ask, Architect, etc.)
- Number of messages exchanged
- Task title and tags

This metadata appears at the beginning of the exported file and can be helpful for organizing multiple exports.

## Working with Exported Files

### Sharing Exports

Exported conversations in Markdown format can be:
- Added to project documentation
- Shared in collaboration tools like Notion, Slack, or Teams
- Included in GitHub repositories (especially in `.md` files)
- Published on blogs or websites

### Editing Exports

You can edit exported files to:
- Remove sensitive information
- Highlight key points
- Add additional notes or context
- Organize information into sections

### Converting Between Formats

You can convert between formats using various tools:
- Markdown to HTML using any Markdown processor
- Markdown to PDF using VS Code extensions
- JSON to CSV using data conversion tools

## Privacy Considerations

Task History Export includes several privacy features:

- Environment details are automatically removed
- File paths are cleaned to remove username/system info
- You can review exports before sharing them
- You control where exports are saved

## Best Practices

1. **Export important conversations** right after they conclude
2. **Use descriptive filenames** (e.g., "react-component-optimization-tips.md")
3. **Choose the right cleanup level** for your audience
4. **Review exports** before sharing them
5. **Include task context** as comments if sharing with others

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Export file is too large | Use aggressive cleanup or export specific parts of the conversation |
| Formatting issues in export | Try a different export format or cleanup level |
| Missing content | Use minimal cleanup to preserve more details |
| Code blocks not formatted correctly | Ensure you're viewing the file with appropriate formatting support |

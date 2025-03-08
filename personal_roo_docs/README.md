# Roo Code Documentation Collection

This directory contains a comprehensive collection of documentation resources for Roo Code, organized into different categories based on technical depth and target audience.

## Documentation Categories

### [Normal Documentation](normal/)

User-friendly guides designed for everyday users of Roo Code. These documents focus on practical usage without diving into technical implementation details.

**Ideal for:**
- New users of Roo Code
- General usage scenarios
- Learning about features without technical complexity

### [Technical Documentation](technical/)

In-depth technical documentation explaining implementation details, architecture, and advanced usage patterns. These documents provide deep insights into how Roo Code works internally.

**Ideal for:**
- Developers extending or customizing Roo Code
- Technical users who want to understand implementation details
- Contributors to the Roo Code project

## Document Inventory

### Core Features

| Topic | Normal | Technical | Purpose |
|-------|--------|-----------|---------|
| **[Browser Automation](normal/browser-automation.md)** | [User Guide](normal/browser-automation.md) | [Technical](technical/browser-automation.md) | Explains how to use Roo's browser control capabilities to interact with websites |
| **[Checkpoint System](normal/checkpoint-system.md)** | [User Guide](normal/checkpoint-system.md) | [Technical](technical/checkpoint-system.md) | Documents Roo's Git-based system for tracking workspace changes during tasks |
| **[Context Mentions](normal/context-mentions.md)** | [User Guide](normal/context-mentions.md) | [Technical](technical/context-mentions.md) | Describes how Roo references specific parts of context in conversations |
| **[Conversation Extraction](normal/conversation-extraction.md)** | [User Guide](normal/conversation-extraction.md) | [Technical](technical/conversation-extraction.md) | Details how to export chat history for sharing and documentation |
| **[Custom Modes](normal/custom-modes.md)** | [User Guide](normal/custom-modes.md) | [Technical](technical/custom-modes.md) | Explains how to create specialized AI behaviors for different roles |
| **[Custom Rules](normal/custom-rules.md)** | [User Guide](normal/custom-rules.md) | [Technical](technical/custom-rules.md) | Shows how to create rules that guide Roo's behavior on specific projects |
| **[Custom System Prompts](normal/custom-system-prompts.md)** | [User Guide](normal/custom-system-prompts.md) | [Technical](technical/custom-system-prompts.md) | Explains how to customize Roo's fundamental behavior with system prompts |
| **[Experimental Features](normal/experimental-features.md)** | [User Guide](normal/experimental-features.md) | [Technical](technical/experimental-features.md) | Covers new and experimental features being developed for Roo |
| **[File Filtering](normal/file-filtering.md)** | [User Guide](normal/file-filtering.md) | [Technical](technical/file-filtering.md) | Shows how to control which files Roo can see and analyze |
| **[Managing Context Window](normal/managing-context-window.md)** | [User Guide](normal/managing-context-window.md) | [Technical](technical/managing-context-window.md) | Explains how to manage Roo's memory efficiently during conversations |
| **[Managing Preferences](normal/managing-preferences.md)** | [User Guide](normal/managing-preferences.md) | [Technical](technical/managing-preferences.md) | Details how to configure Roo's behavior through preferences |
| **[MCP Server Integration](normal/mcp-server-integration.md)** | [User Guide](normal/mcp-server-integration.md) | [Technical](technical/mcp-server-integration.md) | Explains how to connect Roo to external model context protocol servers |
| **[Optimizing Context Usage](normal/optimizing-context-usage.md)** | [User Guide](normal/optimizing-context-usage.md) | [Technical](technical/optimizing-context-usage.md) | Advanced techniques for maximizing Roo's context window efficiency |
| **[Rooignore Configuration](normal/rooignore-configuration.md)** | [User Guide](normal/rooignore-configuration.md) | [Technical](technical/rooignore-configuration.md) | Shows how to exclude files from Roo's visibility using .rooignore files |
| **[Task Management](normal/task-management.md)** | [User Guide](normal/task-management.md) | [Technical](technical/task-management.md) | Explains how to organize different conversations and tasks with Roo |

## Relationship to Other Resources

The documentation in this directory complements the other resources in this repository:

- **[Handoff Manager](../handoff-manager/)**: For managing LLM context across extended development sessions
- **[Handoff System](../handoff-system/)**: Source code for the Handoff Manager
- **[Handoffs](../handoffs/)**: Legacy documentation for the handoff system
- **[Cheatsheets](../cheatsheets/)**: For quick reference guides and code snippets
- **[RooArmy](../roo-army/)**: For creating specialized professional role-based custom modes

## Contributing

Feel free to contribute to this documentation by creating pull requests. When adding new documents, please consider whether they belong in the normal or technical sections, and update the respective README files accordingly.

## License

This documentation is provided under the same MIT License as the rest of the repository.
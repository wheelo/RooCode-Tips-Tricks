# Roo Code: Technical Documentation

This directory contains in-depth technical documentation explaining how Roo Code works internally. These documents provide detailed insights into implementation details, architecture, and advanced usage patterns.

## Available Technical Documentation

### Core Implementation

| Document | Description | Purpose |
|----------|-------------|---------|
| [Browser Automation](browser-automation.md) | Technical implementation of Puppeteer integration | Details the architecture of Roo's browser control system, including the Puppeteer bridge, screenshot processing, and event handling |
| [Checkpoint System](checkpoint-system.md) | Git-based workspace state tracking | Documents the implementation of Roo's shadow repository system for tracking changes and providing restore points |
| [Context Mentions](context-mentions.md) | Source reference implementation | Explains the technical mechanisms used to reference specific code sections, including the indexing and resolution algorithms |
| [Conversation Extraction](conversation-extraction.md) | Task history export pipeline | Details the implementation of conversation extraction, including the parsing, filtering, and formatting mechanisms |
| [Custom Modes](custom-modes.md) | Mode system architecture | Comprehensive explanation of the custom modes implementation, including validation, file restrictions, and integration points |
| [Custom Rules](custom-rules.md) | Rule loading and enforcement | Technical details on how rule files are parsed, loaded, and integrated into the system prompt |
| [Custom System Prompts](custom-system-prompts.md) | System prompt override mechanisms | Explains the implementation of prompt component overrides and how they interact with the core system |

### Core Systems

| Document | Description | Purpose |
|----------|-------------|---------|
| [Experimental Features](experimental-features.md) | Feature flag implementation | Technical overview of the feature flag system used to manage experimental features |
| [File Filtering](file-filtering.md) | File access control mechanisms | Documents the implementation of file filtering systems, including pattern matching and rule application |
| [Managing Context Window](managing-context-window.md) | Token optimization algorithms | Technical explanation of how Roo manages and optimizes the context window to maximize token efficiency |
| [Managing Preferences](managing-preferences.md) | Configuration system implementation | Details on how preferences are stored, loaded, and applied throughout the application |
| [MCP Server Integration](mcp-server-integration.md) | Model Context Protocol implementation | In-depth explanation of how MCP servers are discovered, connected, and utilized |
| [Optimizing Context Usage](optimizing-context-usage.md) | Context compression techniques | Technical details of algorithms used to optimize context window utilization |
| [Rooignore Configuration](rooignore-configuration.md) | Gitignore-style pattern implementation | Explains how .rooignore patterns are parsed, cached, and applied to file operations |
| [Task Management](task-management.md) | Conversation session architecture | Technical details of how Roo manages separate conversation sessions and their state |

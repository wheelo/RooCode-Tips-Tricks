# Roo-Code Technical Documentation

Welcome to the technical documentation for Roo-Code. This section contains detailed implementation information intended for developers and technical users who want to understand the inner workings of Roo-Code's systems.

## Available Documentation

### [Experimental Features](experimental-features.md)
Detailed technical implementation of experimental features including the unified diff strategy, search and replace tool, insert content tool, and power steering mode. Includes code examples, performance considerations, and implementation details.

### [MCP Server Integration](mcp-server-integration.md)
Comprehensive technical guide to the Model Context Protocol implementation, server architecture, tool and resource handling, and advanced integration patterns. Includes security considerations and debugging techniques.

### [Context Mentions](context-mentions.md)
Technical explanation of the @mention system including regex implementation, mention parsing, resolution pipeline, and performance optimization strategies.

### [Custom Rules](custom-rules.md)
Implementation details of the rule loading process, hierarchical rule application, and integration with custom modes. Includes technical examples and advanced usage patterns.

### [Managing Preferences](managing-preferences.md)
Technical details of the settings storage architecture, state management, and configuration hierarchy. Includes implementation guidance for adding new settings.

### [Managing Context Window](managing-context-window.md)
Technical analysis of context window components, sliding window implementation, and configuration options that affect token usage.

### [Optimizing Context Usage](optimizing-context-usage.md)
Comprehensive technical guide to context optimization techniques in Roo-Code, including system prompt construction, sliding window implementation, file filtering, and advanced optimization strategies.

### [Theoretical Sliding Window Enhancement](theoretical-sliding-window-enhancement.md)
Theoretical proposal for enhancing Roo-Code's sliding window implementation with content-aware compression inspired by the handoff system's conversation extraction techniques.

### [Conversation Extraction](conversation-extraction.md)
Technical documentation of Roo-Code's task history export feature, including implementation details of the conversation extraction pipeline, pattern-based content filtering, and the export API.

### [Checkpoint System](checkpoint-system.md)
Technical documentation of Roo-Code's Git-based checkpoint mechanism for tracking workspace state during tasks, including implementation details of shadow repositories, automatic checkpoint creation, and restoration capabilities.

### [Theoretical Improvements](../theoretical)
Collection of theoretical enhancements to Roo-Code, including improvements to the sliding window implementation and conversation history export functionality.

### [Custom System Prompts](custom-system-prompts.md)
Deep dive into the custom system prompts feature that allows complete replacement of the default system prompt with your own instructions and capabilities.

### [Task Management](task-management.md)
Technical implementation of the task management system including task creation, lifecycle, and the new_task tool integration with different modes.

### [File Filtering](file-filtering.md)
Detailed explanation of file filtering capabilities including workspace exclusions and integration with version control systems.

### [.rooignore Configuration](rooignore-configuration.md)
Comprehensive technical guide to the .rooignore system including pattern syntax, implementation, and advanced usage patterns. Covers default ignore patterns and integration with version control.

### [Browser Automation](browser-automation.md)
Technical implementation of the browser automation system, including Puppeteer integration, command flow, screenshot capture, and security considerations.

## Intended Audience

This technical documentation is designed for:
- Developers extending or customizing Roo-Code
- Technical users who want to understand implementation details
- Contributors to the Roo-Code project

For user-friendly documentation without implementation details, please see the [normal documentation](../normal/).
# Roo Code Tips & Tricks

A collection of files designed to supercharge your Roo Code experience and maximize productivity.

## [Roo Code Documentation](personal_roo_docs/)
A comprehensive collection of documentation resources for Roo Code, organized by technical depth and audience:

- **[User-Friendly Guides](personal_roo_docs/normal/)**: Practical guides for everyday Roo Code users covering features, customization, and best practices without technical complexity. Use these to understand what's going on to decide if you need to feed a technical doc into the llm for some purpose.
- **[Technical Documentation](personal_roo_docs/technical/)**: In-depth technical documentation for developers and advanced users who want to understand implementation details. The original goal of these were to create technical documents that could be fed back into Roo for it to understand subsystems. It works pretty well.

## [Roo-Ignore Generator](roo-ignore/README.md)
A smart utility script that generates and updates `.rooignore` files to prevent LLM context overflow. The script:

- Focuses primarily on identifying large files exceeding token limits
- Preserves existing .rooignore content and custom patterns
- Skips scanning large directories for efficiency
- Requires no external dependencies (pure Node.js)


## [Handoff Manager](handoff-manager/docs/handoff-system.md)
**Solve the context window overload problem once and for all.**

The Handoff Manager provides a streamlined approach to manage LLM context across extended development sessions. This innovative system tackles a fundamental issue in extended LLM interactions - as sessions progress, LLMs accumulate context that becomes increasingly bloated with irrelevant information, consuming valuable tokens and degrading performance.

**Key Benefits:**
- **Maintain peak LLM performance** throughout long projects by starting fresh when needed
- **Reduce token consumption and costs** by eliminating redundant context
- **Preserve focus on what matters most** with clean, relevant context windows
- **Break through stubborn debugging challenges** with "fresh eyes" - sometimes a clean perspective solves problems that an overloaded context window cannot
- **Document project progress automatically** as a natural side-effect of the system
- **More streamlined than memory banks** while achieving similar benefits with less complexity
- **Inspired by battle-tested knowledge handoff techniques** refined during intelligence operations where 24/7 situational awareness is mission-critical

During extended debugging sessions, it may feel frustrating to start over with a fresh LLM, but it's often better than continuing down a deteriorating path. The "fresh eyes" of a new session with focused context can break through obstacles that an overloaded session might struggle with.

**Getting Started with the Handoff System:**
1. For a **comprehensive explanation** of the system architecture and concepts, read the [detailed guide](handoff-manager/docs/handoff-system.md)
2. Choose your implementation approach:
   - For a **simple installation** using the automated installer script, follow the [basic installation guide](handoff-manager/docs/basic-installation.md)
   - For a **manual installation** with full customization, follow the [advanced installation guide](handoff-manager/docs/advanced-installation.md)
3. For **usage instructions** after installation, refer to the [usage guide](handoff-manager/docs/usage-guide.md)
4. For **custom mode integration**, refer to [custom modes documentation](personal_roo_docs/technical/custom-modes.md)

**Compatibility Note:** Optimized for Claude 3 models with thinking enabled

## [Large File Handling Cheatsheet](cheatsheets/llm-large-file-cheatsheet.md)
A practical cheatsheet of one-liners and code snippets in Python, Bash, Node.js, and PowerShell for handling large files that would normally exceed LLM context windows. Extract exactly what you need without overwhelming your LLM. This file is designed to be given to the LLM as a reference and to remind it how to do some things.

## [RooArmy - **A fun project, not a useable system** ](roo-army/) 
A sophisticated system for creating and managing professional custom modes in Roo AI Assistant. RooArmy transforms Roo from a general-purpose assistant into a collection of specialized assistants for specific software development roles, with an intelligent assessment system that recommends the optimal configuration for your project.


## Cheatsheets

Resources in the [cheatsheets](cheatsheets/) directory:
- **[Large File Handling](cheatsheets/llm-large-file-cheatsheet.md)**: Handle files that exceed context windows

## Handoff System Components

The repository contains three related directories for handoff functionality:

- **[Handoff Manager](handoff-manager/)**: The production-ready, end-user focused implementation for managing LLM context across extended development sessions. This is the recommended version for users who want to implement the handoff system in their projects.

- **[Handoff System](handoff-system/)**: The source code and build system used to create the Handoff Manager. This directory contains the publisher system that generates the installer and is primarily for developers who want to modify or extend the handoff manager functionality.

- **[Handoffs](handoffs/)**: Legacy documentation from the original version of the handoff system. This directory is maintained for reference purposes and historical context, but new users should use the Handoff Manager instead.

### Custom Mode Systems

Advanced custom mode frameworks:
- **[RooArmy](roo-army/)**: Create role-specialized Roo assistants for professional development teams


## License

This project is open source and available under the [MIT License](LICENSE).

---

**Happy Coding with Roo!** 🐨

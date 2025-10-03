# 🧠 Memory Bank

> **AI-Assisted Development Context for my-project**

This Memory Bank provides persistent project context for AI assistants like Cline, ensuring continuity and understanding across development sessions.

## 📁 Structure

```
memory-bank/
├── README.md                    # This file - Memory Bank overview
├── project/                     # Project Definition & Strategy
│   ├── projectbrief.md         # Mission, goals, scope
│   └── productContext.md       # Problem statement, solution overview
├── technical/                   # Technical Architecture & Implementation
│   ├── systemPatterns.md       # Architecture patterns, design decisions
│   └── techContext.md          # Technology stack, setup, dependencies
└── current/                     # Active Development State
    ├── activeContext.md        # Current work focus, recent changes
    └── progress.md             # Status, completed features, roadmap
```

## 🎯 Purpose

The Memory Bank serves as a comprehensive knowledge base that:

- **Preserves Context**: Maintains project understanding across sessions
- **Accelerates Onboarding**: Provides instant project context for new team members
- **Enhances AI Assistance**: Gives AI assistants rich project background
- **Documents Decisions**: Tracks architectural and product decisions over time
- **Tracks Progress**: Maintains current status and evolution history

## 📖 File Descriptions

### 📋 Project Files (`project/`)

- **`projectbrief.md`**: Core mission, primary goals, target users, success criteria, and project scope
- **`productContext.md`**: Problem analysis, solution overview, user workflows, competitive landscape

### 🔧 Technical Files (`technical/`)

- **`systemPatterns.md`**: Architecture overview, design patterns, data flow, component relationships
- **`techContext.md`**: Technology stack, development environment, build processes, technical constraints

### ⚡ Current State Files (`current/`)

- **`activeContext.md`**: Current work focus, active tasks, recent changes, immediate priorities
- **`progress.md`**: Project status, completed features, known issues, quality metrics

## 🚀 Usage

### For AI Assistants (Cline, etc.)
```bash
# Initialize Memory Bank
shelly memory init

# Check status
shelly memory status

# View specific context
shelly memory show project/projectbrief.md
shelly memory show current/activeContext.md

# Update with latest changes
shelly memory update
```

### For Developers
The Memory Bank is automatically maintained by Shelly but can be manually updated:

1. **Read** relevant context before starting work
2. **Update** active context and progress as you work  
3. **Review** technical decisions and patterns for consistency
4. **Reference** project goals to stay aligned

## 🔄 Maintenance

- **Automatic**: Updated during `shelly organize` and `shelly memory` commands
- **Manual**: Edit files directly or use `shelly memory update`
- **Frequency**: Update `activeContext.md` and `progress.md` regularly
- **Versioning**: Commit Memory Bank changes with your code

## 🎯 Best Practices

1. **Keep Current**: Update active context and progress frequently
2. **Be Specific**: Include concrete details, not just generic statements
3. **Link Decisions**: Reference why choices were made, not just what was chosen
4. **Track Evolution**: Document how the project has evolved over time
5. **Stay Relevant**: Remove outdated information, update priorities

## 🔗 Integration

This Memory Bank integrates with:
- **Shelly CLI**: Automated maintenance and updates
- **AI Assistants**: Rich context for code assistance
- **Development Workflow**: Project onboarding and knowledge transfer
- **Documentation**: Single source of truth for project state

---

**Generated**: 2025-10-01 | **Project**: my-project | **Tool**: Shelly Memory Bank
**Last Updated**: 2025-10-01

> 💡 **Tip**: Use `shelly memory show <file>` to view any Memory Bank file, or browse this directory directly.

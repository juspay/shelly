# Memory Bank Usage Demo Videos Guide

## Required Videos

### 1. memory-bank-init.mp4/.webm
**Duration**: 60-75 seconds
**Purpose**: Show Memory Bank initialization and AI content generation
**Script**:
```bash
# Scene 1: Project without Memory Bank (8s)
$ ls
package.json  src/  docs/  README.md

$ ls memory-bank/
ls: memory-bank/: No such file or directory

# Scene 2: Initialize Memory Bank (30s)
$ shelly memory init
🧠 Initializing Memory Bank for AI-assisted development...

📊 Analyzing project structure...
   ✅ Detected Node.js project (@juspay/shelly)
   ✅ Found package.json metadata
   ✅ Identified project dependencies
   ✅ Analyzed source code patterns

🤖 Generating AI-powered documentation...
   ✅ Created memory-bank/README.md
   ✅ Generated project/projectbrief.md
   ✅ Created project/productContext.md
   ✅ Generated technical/systemPatterns.md
   ✅ Created technical/techContext.md
   ✅ Generated current/activeContext.md
   ✅ Created current/progress.md

📝 Generating Cline integration rules...
   ✅ Created .clinerules for AI assistant integration

🎉 Memory Bank initialized successfully!

# Scene 3: Show Memory Bank structure (12s)
$ tree memory-bank/
memory-bank/
├── README.md
├── project/
│   ├── projectbrief.md
│   └── productContext.md
├── technical/
│   ├── systemPatterns.md
│   └── techContext.md
└── current/
    ├── activeContext.md
    └── progress.md

# Scene 4: Status verification (10s)
$ shelly memory status
🧠 Memory Bank Status: ✅ Complete (7/7 files)

📋 Memory Bank Files:
   ✅ README.md (2.1 KB)
   ✅ project/projectbrief.md (3.4 KB)
   ✅ project/productContext.md (2.8 KB)
   ✅ technical/systemPatterns.md (4.2 KB)
   ✅ technical/techContext.md (3.1 KB)
   ✅ current/activeContext.md (2.5 KB)
   ✅ current/progress.md (1.9 KB)

🎯 Total context: 20.0 KB of AI-generated project documentation
```

**Narration Script**:
- "Initialize comprehensive AI-generated project documentation"
- "Memory Bank analyzes your project and creates structured context"
- "Seven essential files covering project strategy, architecture, and current state"
- "Ready for AI assistant integration and team collaboration"

### 2. ai-context-generation.mp4/.webm
**Duration**: 45-60 seconds
**Purpose**: Show the quality and depth of AI-generated content
**Script**:
```bash
# Scene 1: Show generated project brief (15s)
$ shelly memory show projectbrief.md

# Project Brief: @juspay/shelly

## Mission Statement
Shelly is an AI-powered CLI assistant that revolutionizes developer 
productivity through intelligent error analysis, automated repository 
organization, and persistent AI context management.

## Core Objectives
- **Error Resolution**: Provide instant, AI-powered debugging assistance
- **Project Organization**: Automate repository standardization  
- **AI Integration**: Enable seamless AI-assisted development workflows

## Target Audience
- Individual developers seeking productivity enhancement
- Development teams requiring consistent project standards
- Organizations adopting AI-assisted development practices

# Scene 2: Show technical patterns (15s)
$ shelly memory show technical/systemPatterns.md

# System Patterns & Architecture

## Dual CLI Architecture
Shelly implements a sophisticated dual CLI system:

1. **Error Analysis Engine** (`src/main.js`)
   - Shell history integration
   - AI-powered command analysis
   - Real-time suggestion generation

2. **Repository Management System** (`src/shelly/cli.js`)
   - Project scaffolding automation
   - GitHub integration templates
   - Memory Bank management

## Design Principles
- **Shell Agnostic**: Universal compatibility (bash, zsh, tcsh)
- **AI-First**: Integrated Neurolink and Google AI services
- **Developer Experience**: Minimal configuration, maximum productivity

# Scene 3: Show current context (15s)
$ shelly memory show current/activeContext.md

# Active Development Context

## Current Focus
- Completing comprehensive demo materials for product showcase
- Documentation verification and consistency improvements
- Memory Bank system refinement and AI content quality

## Recent Changes
- Enhanced dual CLI architecture documentation
- Improved error analysis patterns and AI integration
- Streamlined repository organization workflows
```

**Narration Script**:
- "See the quality of AI-generated project documentation"
- "Comprehensive project briefs, technical architecture, and current context"
- "Professional documentation that understands your project deeply"
- "Perfect for onboarding team members and AI assistants"

### 3. cline-integration.mp4/.webm
**Duration**: 50-65 seconds
**Purpose**: Show Memory Bank integration with AI assistants
**Script**:
```bash
# Scene 1: Show .clinerules generation (15s)
$ cat .clinerules | head -20

# @juspay/shelly Project Rules

### **MEMORY BANK INTEGRATION**
- **AI Context Management**: Persistent project understanding via memory-bank/
- **Project Strategy**: See memory-bank/project/ for mission and objectives
- **Technical Architecture**: Reference memory-bank/technical/ for system patterns
- **Current State**: Check memory-bank/current/ for active development context

### **CORE FEATURES**
- **Error Analysis**: AI-powered command debugging and suggestions
- **Repository Organization**: Automated project scaffolding and GitHub integration
- **Memory Bank**: Structured documentation for AI assistant continuity

# Scene 2: Memory Bank file navigation (20s)
$ shelly memory list
Memory Bank Files:

📁 project/
   📄 projectbrief.md (3.4 KB) - Mission, objectives, target audience
   📄 productContext.md (2.8 KB) - Problem statement and solution overview

📁 technical/
   📄 systemPatterns.md (4.2 KB) - Architecture patterns and design decisions
   📄 techContext.md (3.1 KB) - Technology stack and development setup

📁 current/
   📄 activeContext.md (2.5 KB) - Current work focus and recent changes
   📄 progress.md (1.9 KB) - Project status and development roadmap

# Scene 3: Update Memory Bank (15s)
$ git commit -m "Add comprehensive demo structure"
$ shelly memory update
🔄 Updating Memory Bank with latest project state...

📊 Analyzing project changes...
   ✅ Detected new demo structure
   ✅ Found updated documentation
   ✅ Identified new development patterns

🤖 Refreshing AI-generated content...
   ⚡ Updated current/activeContext.md
   ⚡ Enhanced current/progress.md
   ⚡ Refined technical/systemPatterns.md

✅ Memory Bank updated successfully!

# Scene 4: AI assistant integration demo (10s)
# Text overlay: "AI assistants like Cline automatically use this context"
# Show Cline interface or AI assistant reading Memory Bank content
```

**Narration Script**:
- "Memory Bank integrates seamlessly with AI development assistants"
- "Generated .clinerules provide instant AI context for your project"
- "Keep Memory Bank current with automatic updates after changes"
- "AI assistants understand your project without repeated explanations"

## Video Production Guidelines

### Technical Specifications
- **Resolution**: 1080p minimum for text readability
- **Frame Rate**: 30fps (sufficient for documentation viewing)
- **Duration**: 45-75 seconds per video
- **Formats**: MP4 and WebM for web compatibility

### Content Presentation
- **Text Rendering**: Ensure AI-generated content is clearly readable
- **File Navigation**: Show smooth file browsing and content viewing
- **Progress Indicators**: Capture real-time AI content generation
- **Integration Demo**: Show actual AI assistant usage when possible

### Recording Focus Areas

#### Memory Bank Structure Emphasis
```
memory-bank/
├── README.md                    # Overview and usage guide
├── project/                     # Strategic project information
│   ├── projectbrief.md         # Mission, goals, target audience
│   └── productContext.md       # Problem statement, solution approach
├── technical/                   # Architecture and implementation
│   ├── systemPatterns.md       # Design patterns, architecture decisions
│   └── techContext.md          # Technology stack, development setup
└── current/                     # Active development state
    ├── activeContext.md        # Current work focus, recent changes
    └── progress.md             # Project status, roadmap, milestones
```

#### AI Content Quality Showcase
- **Professional Writing**: Show high-quality, comprehensive documentation
- **Technical Accuracy**: Demonstrate deep understanding of project architecture
- **Contextual Awareness**: Show how AI understands project specifics
- **Structured Information**: Highlight organized, useful content format

### Demo Scenarios

#### Scenario 1: New Project Memory Bank
```bash
# Fresh project
$ npm init -y
$ shelly organize
$ shelly memory init
# Show complete Memory Bank creation from scratch
```

#### Scenario 2: Existing Project Enhancement
```bash
# Project with some documentation
$ ls
README.md  src/  package.json
$ shelly memory init
# Show AI enhancement of existing project understanding
```

#### Scenario 3: Development Workflow Integration
```bash
# Regular development session
$ git add .
$ git commit -m "Add new features"
$ shelly memory update
# Show how Memory Bank stays current with development
```

### Quality Standards
- **Real Content**: Show actual AI-generated content, not mock-ups
- **Performance**: Demonstrate realistic generation and update timing
- **Integration**: Show genuine AI assistant interaction when possible
- **Usefulness**: Emphasize practical value for development teams

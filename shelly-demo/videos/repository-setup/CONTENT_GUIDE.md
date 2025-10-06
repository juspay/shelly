# Repository Setup Demo Videos Guide

## Required Videos

### 1. project-organization.mp4/.webm
**Duration**: 60-75 seconds
**Purpose**: Show complete project scaffolding transformation
**Script**:
```bash
# Scene 1: Messy project state (10s)
$ ls
index.js  helper.js  test.js  config.json  notes.txt  package.json

$ cat package.json
{
  "name": "my-project",
  "version": "1.0.0",
  "main": "index.js"
}

# Scene 2: Run shelly organize (25s)
$ shelly organize
🚀 Organizing repository structure...

📁 Creating directory structure...
   ✅ Created src/
   ✅ Created docs/
   ✅ Created .github/ISSUE_TEMPLATE/
   ✅ Created .github/workflows/

📝 Generating project files...
   ✅ Enhanced package.json with @juspay/ prefix
   ✅ Created comprehensive README.md
   ✅ Added CONTRIBUTING.md
   ✅ Created CODE_OF_CONDUCT.md

🔧 Setting up development tools...
   ✅ Created .eslintrc.js
   ✅ Created .prettierrc
   ✅ Added commitlint configuration

🎉 Repository organization complete!

# Scene 3: Show organized structure (15s)
$ tree
my-project/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── API.md
│   └── GETTING_STARTED.md
├── src/
│   ├── index.js
│   └── utils/
│       └── helper.js
├── .eslintrc.js
├── .gitignore
├── package.json
└── README.md

# Scene 4: Verify organization (10s)
$ shelly status
📊 Organization Score: 15/15 (100%)
🎉 Repository is fully organized!
```

**Narration Script**:
- "Transform any messy project into a professional repository"
- "Shelly organizes files and generates industry-standard templates"
- "Complete GitHub integration with workflows and issue templates"
- "Professional project structure in seconds"

### 2. github-integration.mp4/.webm
**Duration**: 45-60 seconds
**Purpose**: Focus on GitHub templates and CI/CD setup
**Script**:
```bash
# Scene 1: Project without GitHub integration (8s)
$ ls .github/
ls: .github/: No such file or directory

# Scene 2: Run organize with GitHub focus (20s)
$ shelly organize
📝 Setting up GitHub integration...
   ✅ Created .github/ISSUE_TEMPLATE/bug_report.md
   ✅ Created .github/ISSUE_TEMPLATE/feature_request.md
   ✅ Created .github/PULL_REQUEST_TEMPLATE.md
   ✅ Created .github/workflows/ci.yml
   ✅ Created .github/CODEOWNERS

# Scene 3: Show GitHub files (15s)
$ find .github/ -type f
.github/ISSUE_TEMPLATE/bug_report.md
.github/ISSUE_TEMPLATE/feature_request.md
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/ci.yml
.github/CODEOWNERS

# Scene 4: Show CI workflow content (12s)
$ cat .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint
```

**Narration Script**:
- "Automatic GitHub integration with professional templates"
- "Issue templates, PR templates, and CI/CD workflows"
- "Production-ready GitHub Actions configuration"
- "Professional open-source project setup"

### 3. package-enhancement.mp4/.webm
**Duration**: 50-65 seconds
**Purpose**: Show package.json enhancement and metadata optimization
**Script**:
```bash
# Scene 1: Basic package.json (10s)
$ cat package.json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}

# Scene 2: Run organization (15s)
$ shelly organize
📦 Enhancing package.json...
   ✅ Added @juspay/ prefix
   ✅ Enhanced metadata and descriptions
   ✅ Added comprehensive npm scripts
   ✅ Configured repository information
   ✅ Added keywords and author info

# Scene 3: Show enhanced package.json (20s)
$ cat package.json
{
  "name": "@juspay/my-project",
  "version": "1.0.0",
  "description": "AI-enhanced project organized with Shelly",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "format": "prettier --write .",
    "prepare": "husky install"
  },
  "keywords": ["juspay", "ai-enhanced"],
  "author": "Juspay Technologies",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/juspay/my-project.git"
  }
}

# Scene 4: Validation (10s)
$ npm run
Available scripts:
  start, test, lint, lint:fix, format, prepare
```

**Narration Script**:
- "Automatic package.json enhancement with @juspay/ scoping"
- "Professional metadata, scripts, and repository information"
- "Industry-standard npm scripts for development workflow"
- "Ready for publication and collaboration"

## Video Production Guidelines

### Technical Specifications
- **Resolution**: 1080p minimum, 1440p preferred for file trees
- **Frame Rate**: 30fps (sufficient for file/text operations)
- **Duration**: Keep under 90 seconds for attention span
- **Formats**: MP4 and WebM for broad compatibility

### Visual Presentation
- **Split Screen**: Before/after comparisons where helpful
- **File Explorer**: Use clean file manager views (VS Code, Finder)
- **Text Highlighting**: Highlight key changes and improvements
- **Progress Indicators**: Show real-time organization progress

### Content Focus Areas

#### Directory Structure Visualization
```bash
# Before (messy)
project/
├── index.js
├── helper.js
├── test.js
├── random-file.txt
└── package.json

# After (organized)
project/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
├── src/
│   ├── index.js
│   └── utils/
├── .eslintrc.js
├── .gitignore
├── package.json
└── README.md
```

#### Package.json Enhancement Points
- **Scoping**: `my-project` → `@juspay/my-project`
- **Scripts**: Basic → Comprehensive development scripts
- **Metadata**: Empty → Rich project information
- **Repository**: Missing → Complete GitHub integration
- **Dependencies**: Basic → Development-ready

### Recording Scenarios

#### Scenario 1: Empty Project Bootstrap
```bash
$ npm init -y
$ shelly organize
# Show complete scaffolding from scratch
```

#### Scenario 2: Legacy Project Modernization
```bash
# Start with old-style project
$ ls
index.php  styles.css  script.js  README.txt
$ shelly organize
# Show modernization and restructuring
```

#### Scenario 3: Multi-Type Project Support
```bash
# React project
$ npx create-react-app my-app
$ cd my-app && shelly organize

# CLI tool project
$ mkdir cli-tool && cd cli-tool
$ npm init -y && shelly organize

# Library project
$ mkdir my-lib && cd my-lib
$ npm init -y && shelly organize
```

### Quality Checkpoints
- **File Operations**: Show actual file creation, not simulated
- **Real Content**: Display actual generated content, not placeholders
- **Performance**: Demonstrate realistic organization timing
- **Verification**: Always show status check at the end
- **GitHub Integration**: Show how templates appear in actual GitHub interface

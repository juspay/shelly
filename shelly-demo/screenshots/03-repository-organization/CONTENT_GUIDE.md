# Repository Organization Screenshots Guide

## Required Screenshots

### 1. before-organization.png
**Purpose**: Show a messy, unorganized project structure
**Content**:
- File explorer showing disorganized project:
  - Files scattered in root directory
  - Missing essential files (.gitignore, README.md, etc.)
  - No proper src/ structure
  - Mixed file types in same directory
**Example Structure**:
```
my-project/
├── index.js
├── helper.js
├── test.js
├── config.json
├── notes.txt
└── package.json
```

### 2. organize-command.png
**Purpose**: Show the `shelly organize` command in action
**Content**:
- Terminal showing the command execution
- Progress indicators and file creation messages
- Real-time output showing what Shelly is doing:
  - "✅ Created src/ directory"
  - "📝 Generated README.md"
  - "🔧 Created .eslintrc.js"
  - "📋 Added GitHub templates"
**Command Output Example**:
```bash
$ shelly organize
🚀 Organizing repository structure...

📁 Creating directory structure...
   ✅ Created src/
   ✅ Created docs/
   ✅ Created .github/

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
```

### 3. after-organization.png
**Purpose**: Show the clean, organized project structure
**Content**:
- File explorer showing perfectly organized structure
- All standard files in place
- Clear directory hierarchy
- Professional project layout
**Example Organized Structure**:
```
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
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── package.json
└── README.md
```

## Technical Requirements
- **File Explorer**: Use a clear file manager (VS Code explorer, Finder, etc.)
- **Syntax Highlighting**: Enable for configuration files
- **Tree View**: Show directory structures clearly
- **Progress Animation**: Capture the real-time organization process
- **Comparison Views**: Side-by-side before/after where helpful

# API Documentation

> CLI and Programmatic API reference for @juspay/shelly

## Overview

Shelly provides both command-line interfaces and programmatic APIs for AI-powered command analysis, repository organization, and Memory Bank management.

## Command Line Interface (CLI)

> **Important:** Shelly uses a dual CLI architecture with two distinct usage modes:
>
> 1. **Error Analysis Mode:** `shelly` (no arguments) - Analyzes the last failed command from your shell history
> 2. **Repository Management Mode:** `shelly <command>` - Uses specific commands like `organize`, `memory`, `init`, `status`
>
> **These modes are handled by different internal systems and work completely differently.**

### Error Analysis Commands

#### Main Error Analysis

```bash
# Analyze the last failed command
shelly

# Analyze a specific command
shelly "command-to-analyze"

# Debug mode
SHELLY_DEBUG=true shelly

# Shell override
SHELL_OVERRIDE=bash shelly

# Generate shell alias
shelly --alias
```

### Repository Organization Commands

#### Organize Command

```bash
# Basic organization
shelly organize

# Force overwrite existing files
shelly organize --force

# Update mode (preserve existing files)
shelly organize --update

# Move misplaced files to correct directories
shelly organize --move

# Specify target directory
shelly organize --directory /path/to/project
```

#### Project Initialization

```bash
# Initialize new project
shelly init <project-name>

# With template and directory options
shelly init my-project --template typescript --directory ~/projects
```

#### Status Check

```bash
# Check repository organization status
shelly status

# Check specific directory
shelly status --directory /path/to/project
```

### Memory Bank Commands

#### Memory Bank Management

```bash
# Initialize Memory Bank
shelly memory init

# Force reinitialize
shelly memory init --force

# Update Memory Bank
shelly memory update

# Update specific file
shelly memory update --file progress.md

# Show Memory Bank status
shelly memory status

# List all Memory Bank files
shelly memory list

# Display specific file content
shelly memory show <filename>
shelly memory show projectbrief.md
shelly memory show current/activeContext.md
```

### GitHub Repository Setup Commands

#### GitHub Configuration Management

```bash
# Full GitHub setup commands
shelly github setup                    # Interactive setup with confirmation
shelly github setup --force           # Skip confirmation prompts
shelly github setup --dry-run         # Preview changes without applying
shelly github setup --directory /path # Setup specific repository

# Shortcut commands (same functionality)
shelly gh                              # Shortcut for github setup
shelly gh --force                      # Quick forced setup
shelly gh --dry-run                    # Quick dry run

# Complete repository setup (GitHub + organize)
shelly setup                           # Run both GitHub setup AND organize
shelly setup --force                   # Skip all confirmations
shelly setup --github-only            # Only GitHub setup, skip organize
shelly setup --organize-only          # Only organize, skip GitHub setup
```

#### GitHub Setup Prerequisites

```bash
# Required environment variable
export GITHUB_TOKEN=your_token_here

# Required scopes for classic tokens:
# - repo (full control of private repositories)
# - admin:repo_hook (admin access to repository hooks)
# - write:packages (write packages to GitHub Package Registry)
```

## Programmatic API

### Core Services

#### Analysis Service

```javascript
import {
  analyzeError,
  suggestCorrections,
} from './src/services/analysisService.js';

// Analyze command error
const analysis = await analyzeError(
  errorOutput, // stderr or stdout
  commandHistory, // array of previous commands
  exitCode // command exit code
);

// Get command suggestions
await suggestCorrections(failedCommand);
```

#### History Service

```javascript
import {
  getLastCommandFromShellHistory,
  getCommandHistory,
  appendCommandToHistory,
} from './src/services/historyService.js';

// Get last command from shell
const lastCommand = await getLastCommandFromShellHistory();

// Get command history
const history = getCommandHistory();

// Add command to history
appendCommandToHistory(command, exitCode);
```

#### Command Service

```javascript
import { runCommand } from './src/services/commandService.js';

// Execute command and get results
const { stdout, stderr, code } = await runCommand(command);
```

### Organization API

#### Organize Command Class

```javascript
import { OrganizeCommand } from './src/shelly/commands/organize.js';

const organizer = new OrganizeCommand({
  force: false,
  update: true,
  move: false,
  cwd: '/path/to/project',
});

await organizer.execute();
```

#### Memory Bank Service

```javascript
import { memoryBankService } from './src/shelly/services/memoryBankService.js';

// Initialize Memory Bank
const results = await memoryBankService.initializeMemoryBank(packageInfo, {
  force: false,
});

// Update Memory Bank
await memoryBankService.updateMemoryBank(fileName, packageInfo);

// Read Memory Bank file
const content = await memoryBankService.readMemoryBankFile('projectbrief.md');

// Get Memory Bank status
const status = await memoryBankService.getMemoryBankStatus();

// List Memory Bank files
const files = await memoryBankService.listMemoryBankFiles();
```

#### GitHub Service

```javascript
import { GitHubService } from './src/shelly/services/githubService.js';

const githubService = new GitHubService();

// Update repository settings
await githubService.updateRepositorySettings(owner, repo);

// Create branch protection ruleset
await githubService.createBranchProtectionRuleset(owner, repo, 'release');

// Setup GitHub Pages
await githubService.setupGitHubPages(owner, repo);

// Configure GitHub Actions permissions
await githubService.configureActionsPermissions(owner, repo);

// Check NPM token setup
const hasToken = await githubService.checkNpmTokenSetup(owner, repo);

// Complete GitHub setup
const result = await githubService.setupRepository(owner, repo, {
  dryRun: false,
  skipConfirmation: true,
});
```

### AI Content Generation

#### AI Content Generator

```javascript
import { AIContentGenerator } from './src/shelly/utils/aiContentGenerator.js';

const generator = new AIContentGenerator();

// Generate README
const readme = await generator.generateReadme(repoAnalysis);

// Generate CONTRIBUTING guide
const contributing = await generator.generateContributing(repoAnalysis);

// Generate Memory Bank content
const projectBrief = await generator.generateProjectBrief(packageInfo);
const systemPatterns = await generator.generateSystemPatterns(packageInfo);
```

## Memory Bank Structure

### File Organization

```
memory-bank/
├── README.md                    # Memory Bank overview
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

### Memory Bank API

```javascript
// Get Memory Bank status
const status = await memoryBankService.getMemoryBankStatus();
/*
Returns:
{
  exists: boolean,
  complete: boolean,
  files: { [filename]: boolean },
  missingFiles: string[],
  lastUpdated: Date
}
*/

// List files with metadata
const files = await memoryBankService.listMemoryBankFiles();
/*
Returns:
[
  {
    name: string,
    exists: boolean,
    lastModified: Date,
    size: number
  }
]
*/
```

## Configuration

### Environment Variables

```bash
# AI Integration
export GOOGLE_AI_API_KEY="your-api-key"              # Google AI Studio (free)
export GOOGLE_CLOUD_PROJECT="your-project-id"        # Vertex AI (enterprise)
export GOOGLE_CLOUD_REGION="us-east5"                # Vertex AI region
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# GitHub Integration
export GITHUB_TOKEN="your-github-token"              # GitHub API access token

# Debug Options
export SHELLY_DEBUG=true                             # Enable debug logging
export SHELL_OVERRIDE=bash                           # Force shell detection

# Development
export NODE_ENV=development                          # Development mode
```

### Configuration Files

#### .clinerules

Generated automatically by Shelly for AI assistant integration:

```bash
# Generated by Memory Bank
.clinerules                    # Cline AI assistant rules

# Created by organize command
.eslintrc.js                   # ESLint configuration
.prettierrc                    # Prettier configuration
commitlint.config.js           # Commitlint configuration
```

## Integration Patterns

### Shell Integration

```bash
# Bash/Zsh integration
eval "$(shelly --alias)"

# Tcsh integration
alias shelly "node /path/to/shelly/src/main.js"

# Error hook (optional)
trap 'shelly' ERR
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Organize Repository
  run: |
    npm install -g @juspay/shelly
    shelly organize --update
    shelly memory update

- name: Check Repository Status
  run: shelly status
```

### AI Assistant Integration

```javascript
// Cline integration via .clinerules
// Memory Bank provides context automatically

// Custom AI integration
const memoryBank = await memoryBankService.readMemoryBankFile(
  'current/activeContext.md'
);
// Use memoryBank content as context for AI prompts
```

## Error Handling

### CLI Exit Codes

- `0`: Success
- `1`: General error
- `2`: Invalid arguments
- `3`: File system error
- `4`: AI service error

### Error Response Format

```javascript
// Service errors return structured objects
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message',
    details: {}
  }
}
```

## Examples

### Complete Project Setup

```javascript
import { OrganizeCommand } from '@juspay/shelly/src/shelly/commands/organize.js';
import { memoryBankService } from '@juspay/shelly/src/shelly/services/memoryBankService.js';

async function setupProject(projectPath) {
  // Organize repository
  const organizer = new OrganizeCommand({
    cwd: projectPath,
    update: true,
  });
  await organizer.execute();

  // Initialize Memory Bank
  const analysis = await memoryBankService.analyzeRepository(projectPath);
  await memoryBankService.initializeMemoryBank(analysis);

  console.log('Project setup complete!');
}
```

### Custom Error Analysis

```javascript
import { analyzeError } from '@juspay/shelly/src/services/analysisService.js';

async function analyzeCustomError(command, error, history = []) {
  const analysis = await analyzeError(error, history, 1);

  return {
    command,
    error,
    analysis,
    timestamp: new Date().toISOString(),
  };
}
```

## Support

- **Issues**: [GitHub Issues](https://github.com/juspay/shelly/issues)
- **Documentation**: [Project Documentation](../docs)
- **Email**: opensource@juspay.in
- **Memory Bank**: Check `memory-bank/` directory for project-specific context

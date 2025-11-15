# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building
```bash
npm run build              # Compile TypeScript and copy templates
npm run copy-templates     # Copy template files to dist/
```

### Testing
```bash
npm test                   # Build and run all tests in dist/tests/
npm run test               # Same as above
```

### Code Quality
```bash
npm run lint               # Run ESLint on .js and .ts files
npm run lint:fix           # Auto-fix linting issues
npm run format             # Format all files with Prettier
npm run format:check       # Check formatting without changes
```

### Local Development
```bash
npm start                  # Build and run the CLI
node dist/main.js          # Run error analysis mode directly
node dist/shelly/cli.js    # Run repository management mode directly
```

## Architecture Overview

### Dual CLI Architecture

Shelly has **two distinct entry points** that handle different use cases:

#### 1. Error Analysis Mode (`src/main.ts`)
- **Entry Point**: `dist/main.js`
- **Usage**: `shelly` (no arguments) or `shelly "command"`
- **Purpose**: Analyzes failed shell commands and provides AI-powered suggestions
- **Key Components**:
  - `services/historyService.ts` - Shell history retrieval
  - `services/commandService.ts` - Command execution
  - `services/analysisService.ts` - AI error analysis via Neurolink
  - `services/shellService.ts` - Multi-shell support (bash, zsh, tcsh)
  - `rules/` - Pattern-based command correction rules

#### 2. Repository Management Mode (`src/shelly/cli.ts`)
- **Entry Point**: `dist/shelly/cli.js`
- **Usage**: `shelly <command>` (organize, memory, github, etc.)
- **Purpose**: Project scaffolding, GitHub setup, Memory Bank management
- **Key Components**:
  - `shelly/commands/organize.ts` - Repository scaffolding
  - `shelly/commands/memory.ts` - Memory Bank management
  - `shelly/commands/githubSetup.ts` - GitHub configuration automation
  - `shelly/services/githubService.ts` - GitHub API integration
  - `shelly/services/memoryBankService.ts` - AI context management
  - `shelly/templates/` - Project scaffolding templates

### Service Layer Structure

The codebase follows a service-oriented architecture:

- **Core Services** (`src/services/`): Handle error analysis functionality
  - Shell integration, command execution, history management
  - AI-powered error analysis using @juspay/neurolink

- **Repository Services** (`src/shelly/services/`): Handle repository management
  - GitHub API operations, Memory Bank content generation
  - Template-based project scaffolding

### Key Integration: Neurolink

All AI operations use `@juspay/neurolink` (Google Vertex AI wrapper):
- Error analysis and suggestions
- Memory Bank content generation
- AI-assisted scaffolding

The package provides unified AI capabilities across both CLI modes.

## Important Architectural Patterns

### Shell Alias Function
The shell integration (`generateShellAlias()` in src/main.ts:20) generates POSIX-compatible shell functions that:
- Work across bash, zsh, and other shells
- Capture real-time command history using `fc` and `history` commands
- Route to appropriate CLI mode based on arguments

### Template System
Repository scaffolding uses a template directory (`src/shelly/templates/`) that:
- Contains project structure templates (GitHub workflows, configs, etc.)
- Is copied to `dist/` during build via `scripts/copy-templates.js`
- Must be included in the published package (see package.json "files" field)

### Environment Variables
- `SHELLY_DEBUG=true` - Enable detailed logging in error analysis mode
- `SHELL_OVERRIDE=<shell>` - Force specific shell detection
- `GITHUB_TOKEN` - Required for GitHub repository setup commands

## TypeScript Configuration

- **Target**: ES2022 with ESNext modules
- **Module System**: ESM (type: "module" in package.json)
- **Strict Mode**: Disabled for flexibility (`strict: false`)
- **Output**: Compiled files go to `dist/`, matching `src/` structure
- **Important**: Use `.js` extensions in imports even for `.ts` files (ESM requirement)

## Testing Considerations

- Tests are in `src/tests/` but excluded from compilation
- Test files use Node.js built-in test runner (`node --test`)
- Tests must be run after building (`npm test` does this automatically)

## Publishing Workflow

The project uses semantic-release for automated publishing:
- Conventional commits trigger version bumps
- CI/CD via GitHub Actions (see .github/workflows/)
- Requires `NPM_TOKEN` for publishing to npm registry
- Pre-publish hook runs build automatically (`prepublishOnly` script)

## Common Gotchas

1. **Import Extensions**: Always use `.js` in imports, even for TypeScript files (ESM requirement)
2. **Template Files**: Changes to templates require running `npm run copy-templates`
3. **Dual Entry Points**: When debugging, ensure you're testing the correct entry point for the feature
4. **Shell Integration**: The alias function must be sourced in shell config for real-time history access
5. **API Keys**: Neurolink requires Google Cloud credentials for AI features to work

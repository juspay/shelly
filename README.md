# Shelly

An intelligent CLI assistant that analyzes your command-line history to provide smart, AI-powered suggestions for failed commands. Shelly helps you debug and fix errors without leaving your terminal, boosting productivity with advanced repository organization and AI-assisted development features.

## Features

### 🔍 Core Error Analysis

- **Smart Error Analysis**: Uses AI to analyze command failures and suggest fixes
- **Multi-Provider AI**: Supports Google, Ollama, OpenRouter, Mistral, and OpenAI
- **Free Tier Options**: Works with Ollama (local), OpenRouter free models, or Google AI free tier
- **Multi-Shell Support**: Works with bash, zsh, tcsh
- **Real-time History Access**: Reliably gets the last command from your shell
- **Command Suggestions**: Suggests similar commands when you mistype
- **Cross-Platform**: macOS and Linux support

### 🏗️ Repository Organization

- **AI-Powered Scaffolding**: Complete project structure generation
- **GitHub Integration**: Automated templates, workflows, and issue templates
- **Repository Setup**: Automated GitHub repository configuration with best practices
- **Package Enhancement**: Automatic @juspay/ prefix and metadata optimization
- **File Organization**: Smart file placement and cleanup with `--move` option
- **Configuration Setup**: ESLint, Prettier, Commitlint, and more

### 🧠 Memory Bank System

- **AI Context Management**: Persistent project context for AI assistants
- **Organized Documentation**: Structured project knowledge base
- **Neurolink Integration**: Advanced AI content generation
- **Development Continuity**: Seamless context across development sessions
- **Team Collaboration**: Shared project understanding

## Getting Started

Choose your installation method based on your needs:

### 🚀 For End Users (Recommended)

If you want to use Shelly as a command-line tool, install it globally:

```bash
npm install -g @juspay/shelly
```

**📖 Next Steps:** Follow the [Quick Start Guide](docs/QUICK_START.md) for complete setup instructions including shell integration and API configuration.

### 🛠️ For Developers & Contributors

If you want to contribute to the project or run it locally for development:

```bash
# Clone and navigate to project directory
git clone https://github.com/juspay/shelly.git
```

**📖 Next Steps:** Follow the [Complete Setup Guide](docs/SETUP.md) for detailed local development instructions.

## Usage

> **Important:** Shelly uses a dual CLI architecture with two distinct usage modes:
>
> 1. **Error Analysis Mode:** `shelly` (no arguments) - Analyzes the last failed command from your shell history
> 2. **Repository Management Mode:** `shelly <command>` - Uses specific commands like `organize`, `memory`, `github/gh`, `setup`, `config`, `init`, `status`
>
> These are handled by different internal systems, so the commands work differently.

### 🔍 Error Analysis (Core Feature)

After setup, simply run `shelly` after any failed command:

```bash
$ grp "hello" file.txt
grp: command not found

$ shelly
Analyzing previous command: "grp "hello" file.txt"

Maybe you meant: grep "hello" file.txt

--- Neurolink Analysis ---
The error "grp: command not found" indicates that the shell could not find the 'grp' command.
The correct command is likely 'grep' which is used for searching text patterns in files.
--------------------------

Did you mean one of these?
- grep
- git
- gcc
```

### 🏗️ Repository Organization

Transform any project into a publication-ready repository:

```bash
# Organize current project with full scaffolding
shelly organize

# Force overwrite existing files
shelly organize --force

# Only add missing files, preserve existing ones
shelly organize --update

# Move misplaced files to correct directories
shelly organize --move

# Organize a specific directory
shelly organize --directory /path/to/project

# Check repository organization status
shelly status

# Initialize a brand new project
shelly init my-new-project
shelly init my-project --template typescript --directory ~/projects
```

### 🧠 Memory Bank Management

Create and maintain AI-assisted development context:

```bash
# Initialize Memory Bank for the current project
shelly memory init

# Force reinitialize existing Memory Bank
shelly memory init --force

# Check Memory Bank status and files
shelly memory status

# List all Memory Bank files with details
shelly memory list

# View specific Memory Bank file content
shelly memory show projectbrief.md
shelly memory show current/activeContext.md

# Update all Memory Bank files with latest project state
shelly memory update

# Update only a specific file
shelly memory update --file progress.md
```

### 🚀 GitHub Repository Setup

Configure your GitHub repository with industry best practices for publishing and collaboration:

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

**Prerequisites:**

- Set your GitHub token: `export GITHUB_TOKEN=your_token_here`
- Admin access to the target repository
- Repository must be a Git repository with GitHub remote
- Required scopes: `repo`, `admin:repo_hook`, `write:packages` (for classic tokens)

**What it configures:**

- ✅ Repository merge settings (disable merge commits, disable squash merge, allow rebase only)
- ✅ Branch management (auto-delete branches, suggest PR updates, disable auto-merge)
- ✅ Branch protection ruleset "release" (restrict deletions, require linear history, require PR, block force pushes)
- ✅ GitHub Copilot code review (if available)
- ✅ GitHub Actions workflow permissions and fork PR approval settings
- ✅ NPM token setup guidance for automated publishing
- ✅ GitHub Pages configuration with docs folder structure

### 🔧 Advanced Error Analysis Options

#### Debug Mode

Enable detailed logging for troubleshooting:

```bash
SHELLY_DEBUG=true shelly
```

#### Analyze Specific Commands

You can analyze specific commands directly:

```bash
shelly "your-failed-command"
# Or for local setup: node src/main.js "your-failed-command"
```

#### Shell Override

Force detection of a specific shell:

```bash
SHELL_OVERRIDE=bash shelly
```

## Supported Platforms and Shells

### Supported Shells

- ✅ **Bash** - Full support with real-time history access
- ✅ **Zsh** - Full support with real-time history access (default on macOS Catalina+)
- ✅ **Tcsh/Csh** - Full support with direct alias integration
- 🔄 **Fish** - Partial support with fallback mode

### Platform Support

- **macOS**: Fully supported (Zsh/Bash/Tcsh)
- **Linux**: Fully supported (Bash/Zsh/Tcsh)

## How It Works

### Shell Integration Mechanisms

**Bash/Zsh**: Uses the `fc` command with dynamic function generation for real-time history access.

**Tcsh**: Uses `history 2` command with direct alias definition for reliable access to command history.

**Fallback Mode**: Reads shell history files directly from disk and uses process tree analysis to detect shell type.

### Analysis Process

1. **Shell Integration**: Captures your last command directly from shell memory or history
2. **Command Analysis**: Analyzes the failed command and its error output
3. **AI-Powered Suggestions**: Uses your configured AI provider (or falls back to pattern-based templates if no AI is available)

## Features in Detail

### 🔍 Error Analysis

- **AI Analysis**: Intelligent error interpretation and suggestions using NeuroLink
- **Command Correction**: Suggests likely intended commands for typos
- **History Context**: Uses command history for better analysis
- **Pattern Recognition**: Learns from common error patterns and user corrections

### 🏗️ Repository Organization

- **Smart Scaffolding**: Creates complete project structure with industry best practices
- **GitHub Templates**: Automated issue templates, PR templates, and workflow setup
- **Repository Configuration**: Automated GitHub settings for merge policies, branch protection, and publishing
- **Configuration Management**: ESLint, Prettier, Commitlint, and semantic-release setup
- **Package Optimization**: Enhances package.json with @juspay/ scoping and metadata
- **File Classification**: Intelligent file organization with `--move` option
- **Project Templates**: Support for different project types (React, TypeScript, CLI tools)
- **GitHub Pages Setup**: Automated documentation site configuration

### 🧠 Memory Bank System

- **Project Context**: Maintains comprehensive project understanding for AI assistants
- **Structured Documentation**: Organized into project, technical, and current state files
- **AI Integration**: Seamless integration with Cline and other AI development tools
- **Neurolink Content**: Advanced AI-generated documentation using Google Vertex AI
- **Development Continuity**: Preserves context across development sessions and team changes
- **Knowledge Management**: Central repository for project decisions and evolution

### 🐚 Shell Integration

- **Multi-shell Support**: Native support for bash, zsh, and tcsh
- **History Access**: Retrieves commands from shell history or live session
- **Process Tree Analysis**: Intelligently detects your current shell
- **Alias Generation**: Automatic shell integration setup

## Troubleshooting

> **📚 Detailed Troubleshooting Guide:** For comprehensive installation and runtime troubleshooting, including native module build issues, see the [Complete Troubleshooting Guide](docs/TROUBLESHOOTING.md).

### Common Issues

#### "Could not retrieve the last command from history"

This usually means the shell integration isn't set up correctly.

**Solutions:**

```bash
# For Bash - ensure history is enabled
echo 'HISTSIZE=1000' >> ~/.bashrc
echo 'SAVEHIST=1000' >> ~/.bashrc

# For Zsh - check history settings
echo 'HISTSIZE=1000' >> ~/.zshrc
echo 'SAVEHIST=1000' >> ~/.zshrc

# For Tcsh - ensure history is enabled
echo 'set history = 1000' >> ~/.tcshrc
echo 'set savehist = 1000' >> ~/.tcshrc
```

#### "shelly: command not found"

**Cause:** The alias wasn't set up correctly or shell config wasn't reloaded.

**Solutions:**

1. Check that you added the correct line to your shell configuration file
2. Restart your terminal or run `source ~/.bashrc` (or equivalent for your shell)
3. For global installation, ensure the package is installed: `npm list -g @juspay/shelly`
4. For local development, ensure you're using the correct commands from the [Complete Setup Guide](SETUP.md)

#### Commands not being analyzed

Ensure you're running `shelly` immediately after the failed command. The tool analyzes the most recent command in your shell history.

#### Tcsh Path Issues

**Cause:** The absolute path in the tcsh alias is incorrect.

**Solution:** Use `pwd` in the project directory to get the correct path and update your alias.

### Debug Information

Enable debug mode to see detailed information about what the tool is doing:

```bash
SHELLY_DEBUG=true shelly
```

## Quick Reference

### Command Summary

**Error Analysis:**

```bash
shelly                    # Analyze last failed command
shelly "command"          # Analyze specific command
```

**Repository Organization:**

```bash
shelly organize           # Organize repository structure
shelly organize --force   # Overwrite existing files
shelly organize --update  # Only add missing files
shelly status            # Check organization status
```

**GitHub Setup:**

```bash
shelly gh                 # Quick GitHub setup (shortcut)
shelly github setup       # Full GitHub setup
shelly gh --dry-run       # Preview changes
```

**Complete Setup:**

```bash
shelly setup              # GitHub setup + organize
shelly setup --force      # Skip all confirmations
```

**Memory Bank:**

```bash
shelly memory init        # Initialize project memory
shelly memory status      # Check memory status
shelly memory update      # Update all memory files
```

**AI Configuration:**

```bash
shelly config             # View current AI configuration
shelly config providers   # List available AI providers
shelly config --disable-ai # Use template-based fallback
shelly config --enable-ai  # Re-enable AI features
```

**Project Initialization:**

```bash
shelly init project-name  # Create new project
```

### One-Time Setup Commands

**Bash:**

```bash
echo 'eval "$(shelly --alias)"' >> ~/.bashrc && source ~/.bashrc
```

**Zsh:**

```bash
echo 'eval "$(shelly --alias)"' >> ~/.zshrc && source ~/.zshrc
```

**Fish:**

```bash
echo 'shelly --alias | source' >> ~/.config/fish/config.fish && source ~/.config/fish/config.fish
```

### Usage Workflow

1. Run a command (it may fail)
2. Type `shelly`
3. Get AI-powered analysis and suggestions
4. Apply the suggested fix

## Configuration

The tool automatically detects your shell and adapts its behavior accordingly. No additional configuration is required for basic usage.

### 🤖 AI Configuration

Shelly supports multiple AI providers with automatic detection and fallback. View and manage AI settings:

```bash
# View current AI configuration
shelly config

# List available AI providers and their status
shelly config providers

# Disable AI (use template-based fallback)
shelly config --disable-ai

# Re-enable AI
shelly config --enable-ai
```

#### Supported AI Providers

| Provider       | Free Tier                  | Setup                                                               |
| -------------- | -------------------------- | ------------------------------------------------------------------- |
| **Ollama**     | ✅ Completely free (local) | Install from [ollama.ai](https://ollama.ai)                         |
| **OpenRouter** | ✅ Has free models         | Get API key from [openrouter.ai](https://openrouter.ai)             |
| **Google AI**  | ✅ Free tier available     | Get API key from [aistudio.google.com](https://aistudio.google.com) |
| **Mistral**    | Limited free tier          | Get API key from [mistral.ai](https://mistral.ai)                   |
| **OpenAI**     | Paid only                  | Get API key from [openai.com](https://openai.com)                   |

#### Environment Variables

```bash
# Select specific provider
export SHELLY_AI_PROVIDER=google  # google|ollama|openrouter|mistral|openai

# Use custom model
export SHELLY_AI_MODEL=gemini-2.0-flash

# Select tier (free or paid models)
export SHELLY_AI_TIER=free  # free|paid

# Disable AI completely (use templates only)
export SHELLY_AI_DISABLED=true

# Provider-specific API keys
export GOOGLE_GENERATIVE_AI_API_KEY=your-key
export OPENROUTER_API_KEY=your-key
export MISTRAL_API_KEY=your-key
export OPENAI_API_KEY=your-key
```

#### Auto-Detection Priority

When no provider is explicitly set, Shelly auto-detects available providers in this order:

1. **Ollama** (local, free) - if running at localhost:11434
2. **OpenRouter** - if `OPENROUTER_API_KEY` is set
3. **Google** - if `GOOGLE_GENERATIVE_AI_API_KEY` is set
4. **Mistral** - if `MISTRAL_API_KEY` is set
5. **OpenAI** - if `OPENAI_API_KEY` is set

If no AI provider is available, Shelly falls back to template-based analysis.

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

## Uninstallation

### Remove Shell Integration

Remove the `eval "$(shelly --alias)"` line from your shell configuration file and reload your shell.

## License

MIT License

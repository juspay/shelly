# Getting Started with Shelly

> Complete setup guide for @juspay/shelly - AI-powered CLI assistant

## What is Shelly?

Shelly is an intelligent CLI assistant that provides:
- **🔍 Error Analysis**: AI-powered debugging for failed commands
- **🏗️ Repository Organization**: Complete project scaffolding and enhancement
- **🧠 Memory Bank**: AI-assisted development context management

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher
- A supported shell (bash, zsh, tcsh, fish)

## Installation

### Option 1: Global Installation (Recommended)

Install Shelly globally to use it anywhere:

```bash
npm install -g @juspay/shelly
```

### Option 2: Local Development

For contributing to the project:

```bash
git clone https://github.com/juspay/shelly.git
cd shelly
npm install
```

## Quick Setup

### 1. Configure Shell Integration

Set up shell integration for error analysis:

**Bash:**
```bash
echo 'eval "$(shelly --alias)"' >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**
```bash
echo 'eval "$(shelly --alias)"' >> ~/.zshrc
source ~/.zshrc
```

**Tcsh:**
```bash
echo 'alias shelly "node /path/to/shelly/src/main.js"' >> ~/.tcshrc
source ~/.tcshrc
```

### 2. Configure AI Integration (Optional)

For AI-powered error analysis, set up Google AI:

```bash
export GOOGLE_AI_API_KEY="your-api-key-here"
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Basic Usage

### Error Analysis

Run `shelly` (no arguments) after any failed command:

```bash
$ grp "pattern" file.txt
grp: command not found

$ shelly
Analyzing previous command: "grp "pattern" file.txt"
Maybe you meant: grep "pattern" file.txt

--- Neurolink Analysis ---
The error indicates 'grp' command not found.
The correct command is likely 'grep'.
--------------------------
```

### Repository Organization

Transform projects into publication-ready repositories:

```bash
# Organize current project
shelly organize

# Check organization status
shelly status

# Create new organized project
shelly init my-project
```

### Memory Bank Management

Create AI development context:

```bash
# Initialize Memory Bank
shelly memory init

# Check status
shelly memory status

# View project context
shelly memory show projectbrief.md
```

## Understanding Shelly's Architecture

Shelly uses a **dual CLI architecture**:

1. **Error Analysis Mode**: `shelly` (no arguments) - Analyzes shell history
2. **Repository Management Mode**: `shelly <command>` - Project organization tools

These are completely different systems with different purposes.

## Common Commands

```bash
# Error Analysis
shelly                    # Analyze last failed command
shelly --alias           # Generate shell integration

# Repository Organization
shelly organize          # Organize current project
shelly organize --force  # Overwrite existing files
shelly organize --update # Add missing files only
shelly status           # Check organization status
shelly init <name>      # Create new project

# Memory Bank
shelly memory init      # Initialize Memory Bank
shelly memory status    # Check Memory Bank status
shelly memory update    # Update project context
shelly memory show <file> # View specific file
```

## Troubleshooting

### "Could not retrieve the last command from history"

- Ensure shell integration is properly configured
- Restart your terminal after setup
- Verify your shell supports the `fc` command

### "shelly: command not found"

- Check that the global installation succeeded: `npm list -g @juspay/shelly`
- For local development, use full paths or `node src/main.js`
- Ensure shell configuration was reloaded

### AI Analysis Not Working

- Verify `GOOGLE_AI_API_KEY` environment variable is set
- Check internet connection for API calls
- Try debug mode: `SHELLY_DEBUG=true shelly`

## Next Steps

- **For detailed usage**: See [Quick Start Guide](QUICK_START.md)
- **For development setup**: See [Complete Setup Guide](SETUP.md)
- **For API reference**: See [API Documentation](API.md)

## Getting Help

- **Documentation**: [GitHub Repository](https://github.com/juspay/shelly)
- **Issues**: [Report Issues](https://github.com/juspay/shelly/issues)
- **Email**: opensource@juspay.in

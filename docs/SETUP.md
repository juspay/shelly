# Shelly: Complete Setup Guide (Local Development)

This guide provides a comprehensive walkthrough for setting up, configuring, and using the Shelly project locally for development and contribution purposes.

## 1. Project Overview

Shelly is a command-line tool designed to intercept errors from your last executed command, analyze them, and suggest corrections or provide insights. It works by integrating with your shell to gain access to your command history and uses NeuroLink to provide AI-powered analysis for helpful suggestions.

**Note:** This guide is for developers who want to run Shelly locally from source code. For end-users who want to install Shelly globally, see the [Quick Start Guide](QUICK_START.md).

## 2. Prerequisites

### Required Software

- **Node.js** (version 18.0.0 or higher): Download from [nodejs.org](https://nodejs.org/)
- **npm** or **pnpm**: Package manager (comes bundled with Node.js)
- A supported shell (bash, zsh, tcsh, or fish)

### Build Tools (Required for Native Modules)

Shelly depends on native Node.js modules (like `node-pty`) that need to be compiled for your system. You'll need:

**macOS:**

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Python setuptools (required for Python 3.12+)
python3 -m pip install setuptools

# Verify installations
xcode-select -p
python3 --version
which make gcc g++
```

**Linux (Ubuntu/Debian):**

```bash
# Install build essentials
sudo apt-get update
sudo apt-get install -y build-essential python3 python3-pip

# Install Python setuptools
python3 -m pip install setuptools

# Verify installations
which make gcc g++
python3 --version
```

**Linux (RedHat/CentOS/Fedora):**

```bash
# Install development tools
sudo yum groupinstall "Development Tools"
sudo yum install -y python3 python3-pip

# Install Python setuptools
python3 -m pip install setuptools

# Verify installations
which make gcc g++
python3 --version
```

> **💡 Important for pnpm users:** If using pnpm, ensure build scripts are enabled by creating a `.npmrc` file in the project root with:
>
> ```
> enable-pre-post-scripts=true
> ```

> **🔧 Native Module Build Issues?** If you encounter errors during installation related to `node-pty` or other native modules, see the [Troubleshooting Guide](TROUBLESHOOTING.md#node-pty-build-failures) for detailed solutions.

## 3. Supported Platforms and Shells

### Fully Supported Shells

All of these shells are fully supported, but they use different aliasing mechanisms:

- **Zsh** (Default on macOS Catalina+)
  - Uses: `eval` with dynamic alias generation
  - History file: `~/.zsh_history`
  - Configuration file: `~/.zshrc`

- **Bash** (Common on Linux, older macOS)
  - Uses: `eval` with dynamic alias generation
  - History file: `~/.bash_history` or `$HISTFILE`
  - Configuration file: `~/.bashrc` or `~/.bash_profile`

- **Tcsh/Csh**
  - Uses: Direct alias definition with history command
  - History file: `~/.history`
  - Configuration file: `~/.tcshrc` or `~/.cshrc`

### Partially Supported (Fallback Mode)

These shells fall back to reading history files directly:

- **Fish**
  - History file: `~/.local/share/fish/fish_history`
  - Configuration file: `~/.config/fish/config.fish`

- **PowerShell** (Windows)
  - History file: `%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`

### Platform Support

- **macOS**: Fully supported (Zsh/Bash/Tcsh)
- **Linux**: Fully supported (Bash/Zsh/Tcsh)
- **Windows**: Partial support (PowerShell, WSL recommended)

## 4. Installation

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project directory
cd /path/to/shelly

# Install dependencies
npm install
```

### Step 2: Test Basic Functionality

```bash
# Test the script directly
node src/main.js --help

# Test alias generation (for bash/zsh)
node src/main.js --alias
```

### Step 3: Configure AI Analysis Provider

Create a `.env` file in the project root to store your AI provider credentials:

```bash
# Create .env file in project root
touch .env
```

Choose one of the following authentication methods:

#### Option 1: Google Cloud Project (Paid Use)

For users with a Google Cloud project who want to use the full Google Cloud AI services:

```bash
# Add to .env file
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
export GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

#### Option 2: Google AI API Key (Free/Developer Use)

For individual developers using the free Google AI API:

```bash
# Add to .env file
export GOOGLE_AI_API_KEY=your-api-key-here
```

**Note:** The `.env` file is already included in `.gitignore` to prevent accidentally committing your credentials.

### Step 4: Configure GitHub Token (For Repository Management Features)

If you plan to use Shelly's GitHub repository setup features (`shelly gh`, `shelly setup`), you need a GitHub token.

#### Understanding GitHub Token Types

GitHub offers two types of Personal Access Tokens:

**1. Fine-Grained Tokens (Recommended for Enterprise):**
- More secure with granular permissions
- Required by organizations that block Classic tokens
- Better for specific repository access

**2. Classic Tokens:**
- Broader permissions across all repositories
- May be blocked by enterprise security policies
- Simpler to set up but less secure

#### Setting Up a Fine-Grained Token

1. **Generate the token:**
   - Go to: https://github.com/settings/tokens?type=beta
   - Click "Generate new token"
   - Name it (e.g., "Shelly Repository Setup")
   - Set expiration (e.g., 90 days)

2. **Configure repository access:**
   - Select "Only select repositories"
   - Choose the repositories you want to manage

3. **Set permissions (Required):**
   - **Administration**: Read and write (for repository settings)
   - **Contents**: Read and write (for creating docs folder)
   - **Metadata**: Read-only (automatically included)

4. **Generate and copy the token**
   - Token format: `github_pat_...`

5. **Export the token:**
   ```bash
   # Add to .env file
   export GITHUB_TOKEN=github_pat_your_token_here
   ```

#### Setting Up a Classic Token (If Allowed)

1. **Generate the token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it (e.g., "Shelly Repository Setup")
   - Set expiration

2. **Select scopes (Required):**
   - ✅ `repo` (Full control of private repositories)
   - ✅ `admin:repo_hook` (Full control of repository hooks)
   - ✅ `write:packages` (Upload packages to GitHub Package Registry)

3. **Generate and copy the token**
   - Token format: `ghp_...`

4. **Export the token:**
   ```bash
   # Add to .env file
   export GITHUB_TOKEN=ghp_your_token_here
   ```

#### Troubleshooting Token Issues

**403 Forbidden Error:**
- Your organization may be blocking Classic tokens
- Solution: Use a Fine-Grained token instead
- Alternative: Use SSH for git operations: `git remote set-url origin git@github.com:owner/repo.git`

**Insufficient Permissions:**
- Ensure you have admin access to the repository
- Check that all required permissions are granted in the token
- For Classic tokens, verify all required scopes are selected

## 5. Shell-Specific Configuration

### For Bash Users

**Temporary setup (current session only):**

```bash
eval "$(./src/main.js --alias)"
```

**Permanent setup:**

```bash
# Add to ~/.bashrc (Linux) or ~/.bash_profile (macOS)
echo 'eval "$('"$(pwd)"'/src/main.js --alias)"' >> ~/.bashrc

# Reload configuration
source ~/.bashrc
```

### For Zsh Users

**Temporary setup (current session only):**

```bash
eval "$(./src/main.js --alias)"
```

**Permanent setup:**

```bash
# Add to ~/.zshrc
echo 'eval "$('"$(pwd)"'/src/main.js --alias)"' >> ~/.zshrc

# Reload configuration
source ~/.zshrc
```

### For Tcsh Users

**Note:** Tcsh uses a different aliasing mechanism and cannot use the `--alias` flag.

**Permanent setup:**

```tcsh
# Add to ~/.tcshrc
# Replace /full/path/to/shelly with your actual project path
alias shelly 'set prev_cmd = "`history 2 | head -1 | sed '"'"'s/^[ ]*[0-9]*[ ]*//'"'"'`"; node /full/path/to/shelly/src/main.js "$prev_cmd"'
```

**To get your full path:**

```bash
pwd  # Run this in the project directory to get the full path
```

**Reload configuration:**

```tcsh
source ~/.tcshrc
```

### For Fish Users

```bash
# Add to ~/.config/fish/config.fish
echo 'eval ('"$(pwd)"'/src/main.js --alias)' >> ~/.config/fish/config.fish

# Reload configuration
source ~/.config/fish/config.fish
```

## 6. Usage

### Basic Usage (Same for All Shells)

1. Run any command that might fail:

   ```bash
   git psuh origin main
   # Error: git: 'psuh' is not a git command. See 'git --help'.
   ```

2. Immediately run the log helper:

   ```bash
   shelly
   ```

3. The tool will analyze the error and provide suggestions:

   ```
   Analyzing previous command: "git psuh origin main"

   Maybe you meant: git push origin main

   --- Neurolink Analysis ---
   The command failed because 'psuh' is not a valid git command...
   --------------------------
   ```

### Advanced Usage

#### Debug Mode

Enable detailed logging to troubleshoot issues:

```bash
SHELLY_DEBUG=true shelly
```

#### Manual Command Analysis

Analyze a specific command directly:

```bash
node src/main.js "your command here"
```

#### Shell Override

Force detection of a specific shell:

```bash
SHELL_OVERRIDE=bash shelly
```

## 7. How It Works

### Bash/Zsh Mechanism

- Uses the `fc` command to access shell history
- Dynamic function generation provides optimal integration
- Real-time access to command history

### Tcsh Mechanism

- Uses `history 2` command to get the previous command
- Direct alias definition with command substitution
- Reliable access to tcsh history format

### Fallback Mechanism

- Reads shell history files directly from disk
- Uses process tree analysis to detect shell type
- Less reliable for the most recent commands

## 8. Features

### Error Analysis

- **AI Analysis**: Intelligent error interpretation and suggestions
- **Command Correction**: Suggests likely intended commands for typos
- **History Context**: Uses command history for better analysis

### Shell Integration

- **Multi-shell Support**: Native support for bash, zsh, and tcsh
- **History Access**: Retrieves commands from shell history or live session
- **Process Tree Analysis**: Intelligently detects your current shell

## 9. Troubleshooting

### Common Issues

#### "shelly: command not found"

**Cause:** The alias wasn't set up correctly or shell config wasn't reloaded.

**Solution:**

1. Check that you added the correct line to your shell config
2. Restart your terminal or run `source ~/.bashrc` (or equivalent)

#### Tcsh Path Issues

**Cause:** The absolute path in the tcsh alias is incorrect.

**Solution:** Use `pwd` in the project directory to get the correct path and update your alias.

### Debug Information

Enable debug mode to see detailed information:

```bash
SHELLY_DEBUG=true shelly
```

## 10. Quick Reference

### One-Time Setup Commands

**Bash:**

```bash
echo 'eval "$('"$(pwd)"'/src/main.js --alias)"' >> ~/.bashrc && source ~/.bashrc
```

**Zsh:**

```bash
echo 'eval "$('"$(pwd)"'/src/main.js --alias)"' >> ~/.zshrc && source ~/.zshrc
```

**Tcsh:**

```tcsh
echo 'alias shelly '"'"'set prev_cmd = "`history 2 | head -1 | sed '"'"'"'"'"'"'"'"'s/^[ ]*[0-9]*[ ]*//'"'"'"'"'"'"'"'"'`"; node '"$(pwd)"'/src/main.js "$prev_cmd"'"'"'' >> ~/.tcshrc && source ~/.tcshrc
```

### Usage Workflow

1. Run a command (it may fail)
2. Type `shelly`
3. Get analysis and suggestions

## 11. Uninstallation

1. Remove the alias from your shell configuration file
2. Reload your shell configuration
3. Optionally remove the project directory

---

The tool is designed to be set up once and work seamlessly across different shell environments. Each shell uses the most appropriate mechanism for accessing command history.

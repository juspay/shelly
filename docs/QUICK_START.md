# Shelly Quick Start Guide

Welcome to Shelly! This comprehensive guide will get you up and running with AI-powered command analysis, repository organization, and Memory Bank management in just a few minutes.

## 🚀 What is Shelly?

Shelly is a multi-purpose AI-powered CLI tool that provides:

- **🔍 Error Analysis**: Intelligent debugging for failed commands
- **🏗️ Repository Organization**: Complete project scaffolding and enhancement
- **🧠 Memory Bank**: AI-assisted development context management

## 1. Installation

### Option A: Global Installation (Recommended)

Install Shelly globally using npm:

```bash
npm install -g @juspay/shelly
```

### Option B: Local Development Setup

For contributing or local development:

```bash
git clone https://github.com/juspay/shelly.git
cd shelly
npm install
```

## 2. Configure Shell Integration (For Error Analysis)

Shelly needs shell integration to access command history for error analysis:

### For Bash Users

```bash
echo 'eval "$(shelly --alias)"' >> ~/.bashrc
source ~/.bashrc
```

### For Zsh Users

```bash
echo 'eval "$(shelly --alias)"' >> ~/.zshrc
source ~/.zshrc
```

### For Tcsh/Csh Users

```bash
echo 'alias shelly "node /path/to/shelly/src/main.js"' >> ~/.tcshrc
source ~/.tcshrc
```

### For Fish Users

```bash
echo 'shelly --alias | source' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish
```

## 3. Set Up AI Integration

### Option A: Google AI API (Free, Recommended)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Add to your shell configuration:

```bash
export GOOGLE_AI_API_KEY="YOUR_API_KEY_HERE"
```

### Option B: Google Cloud Vertex AI (Enterprise)

For advanced AI features and Neurolink integration:

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-east5"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

Restart your terminal after setting environment variables.

## 4. Understanding Shelly's Two Modes

> **Important:** Shelly uses a dual CLI architecture with two distinct usage modes:
>
> 1. **Error Analysis Mode:** `shelly` (no arguments) - Analyzes the last failed command from your shell history
> 2. **Repository Management Mode:** `shelly <command>` - Uses specific commands like `organize`, `memory`, `init`, `status`
>
> **These are completely different tools with different purposes!**

## 5. Quick Feature Tour

### 🔍 Error Analysis Mode

Run `shelly` with **no arguments** after any failed command:

```bash
$ grp "pattern" file.txt
grp: command not found

$ shelly
# No arguments - this analyzes the previous command
Analyzing previous command: "grp "pattern" file.txt"
Maybe you meant: grep "pattern" file.txt
```

**Important:** Do NOT pass the command as an argument for error analysis. Just run `shelly` by itself.

### 🏗️ Repository Organization

Transform any project into a publication-ready repository:

```bash
# Organize current project
shelly organize

# Check organization status
shelly status

# Create a new organized project
shelly init my-new-project
```

### 🧠 Memory Bank Setup

Create AI-assisted development context:

```bash
# Initialize Memory Bank
shelly memory init

# Check status
shelly memory status

# View project context
shelly memory show projectbrief.md
```

### 🚀 GitHub Repository Setup

Configure your GitHub repository with best practices for publishing and collaboration:

```bash
# Set up your GitHub token first
export GITHUB_TOKEN=your_token_here

# Quick GitHub setup (shortcut)
shelly gh --force

# Or use the full command
shelly github setup

# Complete setup (GitHub + organize)
shelly setup --force
```

**⚠️ Token Type Requirements:**

Shelly supports both Classic and Fine-Grained GitHub tokens. However, **Enterprise organizations often block Classic tokens**.

**Fine-Grained Token (Recommended for Enterprise):**

1. Go to: https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Select your repository and grant these permissions:
   - **Administration**: Read and write
   - **Contents**: Read and write
   - **Metadata**: Read-only (automatic)
4. Export: `export GITHUB_TOKEN=github_pat_...`

**Classic Token (If Allowed):**

- Required scopes: `repo`, `admin:repo_hook`, `write:packages`
- Generate at: https://github.com/settings/tokens

**What this configures:**

- Repository merge settings (rebase-only workflow)
- Branch protection rules for main branch
- GitHub Pages for documentation
- NPM token guidance for publishing
- GitHub Actions workflow permissions

## 5. Common Workflows

### New Project Setup

```bash
# Create and organize a new project
mkdir my-project && cd my-project
npm init -y
git init
git remote add origin https://github.com/username/my-project.git

# Complete setup (GitHub + organize + memory)
export GITHUB_TOKEN=your_token_here
shelly setup --force
shelly memory init

# Check everything is set up
shelly status
```

### Existing Project Enhancement

```bash
# Navigate to your project
cd existing-project

# Organize and enhance
shelly organize --update  # Preserve existing files
shelly memory init

# Add GitHub best practices (if needed)
export GITHUB_TOKEN=your_token_here
shelly gh --dry-run  # Preview first
shelly gh --force    # Apply settings

# Move misplaced files (optional)
shelly organize --move
```

### Publishing-Ready Repository Setup

```bash
# Transform any repository into a professional, publishing-ready project
cd your-repository

# Complete transformation
export GITHUB_TOKEN=your_token_here
shelly setup --force  # GitHub setup + organize
shelly memory init     # AI context

# Result: Professional repository with:
# - Branch protection rules
# - GitHub Pages setup
# - NPM publishing guidance
# - Complete project structure
# - AI-assisted development context
```

### Daily Development

```bash
# After any failed command
some-failed-command
shelly  # Get AI analysis

# Update project context regularly
shelly memory update

# Check repository health
shelly status
```

## Troubleshooting

### Common Issues

**"Could not retrieve the last command from history"**

- Make sure you've properly set up the shell alias as described in step 2
- Ensure your shell supports the `fc` command (most modern shells do)

**"Could not analyze the error with Neurolink"**

- Verify that your Google AI API key is properly configured
- Check that the `GOOGLE_AI_API_KEY` environment variable is set correctly
- Ensure you have an active internet connection for API calls

**"shelly cannot analyze itself"**

- This is expected behavior. Run another command first, then use `shelly` to analyze it

### Testing Your Setup

To test if everything is working correctly:

1. Run a command that will fail (e.g., `nonexistentcommand`)
2. Run `shelly`
3. You should see an analysis from Neurolink

## Additional Notes

- The tool maintains a command history for better analysis context
- It can analyze both failed commands (exit code ≠ 0) and successful commands
- For "command not found" errors, it will suggest similar available commands from your system

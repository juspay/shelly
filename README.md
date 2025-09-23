# Shelly

A powerful CLI tool that analyzes your failed commands and provides intelligent suggestions to fix them using AI-powered analysis.

## Features

- 🔍 **Smart Error Analysis**: Uses AI to analyze command failures and suggest fixes
- 🐚 **Multi-Shell Support**: Works with bash, zsh etc.
- 🚀 **Real-time History Access**: Reliably gets the last command from your shell
- 🎯 **Command Suggestions**: Suggests similar commands when you mistype
- 🌐 **Cross-Platform**

## Getting Started

Choose your installation method based on your needs:

### 🚀 For End Users (Recommended)

If you want to use Shelly as a command-line tool, install it globally:

```bash
npm install -g @juspay/shelly
```

**📖 Next Steps:** Follow the [Quick Start Guide](QUICK_START.md) for complete setup instructions including shell integration and API configuration.

### 🛠️ For Developers & Contributors

If you want to contribute to the project or run it locally for development:

```bash
# Clone and navigate to project directory
git clone https://github.com/juspay/shelly.git
```

**📖 Next Steps:** Follow the [Complete Setup Guide](SETUP.md) for detailed local development instructions.

## Usage

### Basic Usage

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

### Advanced Usage

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

###Supported Shells

- ✅ **Bash** - Full support with real-time history access
- ✅ **Zsh** - Full support with real-time history access (default on macOS Catalina+)
- ✅ **Tcsh/Csh** - Full support with direct alias integration

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
3. **AI-Powered Suggestions**: Uses advanced analysis to suggest corrections and alternatives

## Features in Detail

### Error Analysis

- **AI Analysis**: Intelligent error interpretation and suggestions using NeuroLink
- **Command Correction**: Suggests likely intended commands for typos
- **History Context**: Uses command history for better analysis

### Shell Integration

- **Multi-shell Support**: Native support for bash, zsh, and tcsh
- **History Access**: Retrieves commands from shell history or live session
- **Process Tree Analysis**: Intelligently detects your current shell

## Troubleshooting

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

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

## Uninstallation

### Remove Shell Integration

Remove the `eval "$(shelly --alias)"` line from your shell configuration file and reload your shell.

## License

MIT License

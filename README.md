# Log Helper Agent

A powerful CLI tool that analyzes your failed commands and provides intelligent suggestions to fix them.

## Features

- 🔍 **Smart Error Analysis**: Uses AI to analyze command failures and suggest fixes
- 🐚 **Multi-Shell Support**: Works with bash, zsh, fish, tcsh, and PowerShell
- 🚀 **Real-time History Access**: Reliably gets the last command from your shell
- 📚 **Rule-based Suggestions**: Built-in rules for common command errors
- 🎯 **Command Suggestions**: Suggests similar commands when you mistype

## Installation

### 1. Install the Package

```bash
npm install -g log-helper-agent
```

### 2. Set Up Shell Integration (One-time setup)

Add the following line to your shell configuration file:

**For Bash** (add to `~/.bashrc`):
```bash
eval "$(log-helper --alias)"
```

**For Zsh** (add to `~/.zshrc`):
```bash
eval "$(log-helper --alias)"
```

**For Fish** (add to `~/.config/fish/config.fish`):
```fish
log-helper --alias | source
```

### 3. Reload Your Shell

```bash
# For bash/zsh
source ~/.bashrc  # or ~/.zshrc

# For fish
source ~/.config/fish/config.fish

# Or simply restart your terminal
```

## Usage

After setup, simply run `log-helper` after any failed command:

```bash
$ grp "hello" file.txt
grp: command not found

$ log-helper
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

## How It Works

1. **Shell Integration**: The `eval "$(log-helper --alias)"` command creates a shell function that captures your last command directly from the shell's memory
2. **Command Analysis**: The tool analyzes the failed command and its error output
3. **AI-Powered Suggestions**: Uses advanced analysis to suggest corrections and alternatives
4. **Rule-Based Fixes**: Applies built-in rules for common mistakes

## Advanced Usage

### Debug Mode

Enable detailed logging:

```bash
LOG_HELPER_DEBUG=true log-helper
```

### Analyze Specific Commands

You can also analyze specific commands directly:

```bash
log-helper "your-failed-command"
```

## Configuration

The tool automatically detects your shell and adapts its behavior accordingly. No additional configuration is required.

## Supported Shells

- ✅ **Bash** - Full support with real-time history access
- ✅ **Zsh** - Full support with real-time history access  
- ✅ **Fish** - Full support
- ✅ **Tcsh/Csh** - Basic support
- ✅ **PowerShell** - Basic support

## Troubleshooting

### "Could not retrieve the last command from history"

This usually means the shell integration isn't set up correctly. Make sure you've added the `eval "$(log-helper --alias)"` line to your shell configuration file and reloaded your shell.

### Commands not being analyzed

Ensure you're running `log-helper` (without arguments) after the failed command. The tool analyzes the most recent command in your shell history.

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

## License

ISC License - see LICENSE file for details.

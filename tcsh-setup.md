# Log-Helper Setup Guide for Different Shells

## One-Time Setup (Never Need to Repeat)

### For Bash Users
Add this line to `~/.bashrc`:
```bash
eval "$(log-helper --alias)"
```

### For Zsh Users  
Add this line to `~/.zshrc`:
```bash
eval "$(log-helper --alias)"
```

### For Tcsh Users
Add this line to `~/.tcshrc`:
```tcsh
alias log-helper 'set prev_cmd = "`history 2 | head -1 | sed '"'"'s/^[ ]*[0-9]*[ ]*//'"'"'`"; node /Users/harshita.rupani/Desktop/log-helper-agent/src/main.js "$prev_cmd"'
```

## How It Works

1. **Setup Once**: Add the appropriate line to your shell's config file
2. **Restart Shell**: Either restart your terminal or run `source ~/.bashrc` (or equivalent)
3. **Use Forever**: From then on, just type `log-helper` after any failed command

## Example Workflow (Same for All Shells)

```bash
$ wrongcommand
wrongcommand: command not found

$ log-helper
# ✅ Analyzes the failed command and provides suggestions
```

## No More Manual Setup Needed!

Once you add the line to your shell config file, log-helper will work automatically every time you open a new terminal session. You never need to run the setup command again!

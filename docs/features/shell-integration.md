# Shell Compatibility

Shelly supports multiple shell environments for its error analysis feature. Each shell uses the most appropriate mechanism for accessing command history.

## Supported Shells

### Fully Supported

| Shell        | History Method                     | Config File |
| ------------ | ---------------------------------- | ----------- |
| **Bash**     | `fc` command via eval alias        | `~/.bashrc` |
| **Zsh**      | `fc` command via eval alias        | `~/.zshrc`  |
| **Tcsh/Csh** | `history` command via direct alias | `~/.tcshrc` |

### Partial Support (Fallback)

| Shell          | History Method    | Config File                  |
| -------------- | ----------------- | ---------------------------- |
| **Fish**       | History file read | `~/.config/fish/config.fish` |
| **PowerShell** | History file read | PSReadLine history           |

## Setup

=== "Bash"

    ```bash
    echo 'eval "$(shelly --alias)"' >> ~/.bashrc
    source ~/.bashrc
    ```

=== "Zsh"

    ```bash
    echo 'eval "$(shelly --alias)"' >> ~/.zshrc
    source ~/.zshrc
    ```

=== "Tcsh"

    ```tcsh
    # Replace /path/to/shelly with your actual path
    alias shelly 'set prev_cmd = "`history 2 | head -1 | sed s/^[ ]*[0-9]*[ ]*//`"; node /path/to/shelly/src/main.js "$prev_cmd"'
    ```

=== "Fish"

    ```fish
    echo 'shelly --alias | source' >> ~/.config/fish/config.fish
    source ~/.config/fish/config.fish
    ```

## How It Works

### Bash/Zsh

The `shelly --alias` command generates a POSIX-compatible shell function that:

1. Uses the `fc` command to capture the last executed command
2. Passes it to Shelly for analysis
3. Works across different shell versions

### Tcsh

Tcsh requires a different approach since `fc` is not available:

1. Uses `history 2` to get the previous command
2. Parses the output with `sed` to extract the command text
3. Passes it directly to the Shelly entry point

### Fallback

For unsupported shells, Shelly reads history files directly from disk using process tree analysis to detect the current shell type.

## Shell Override

Force a specific shell detection:

```bash
SHELL_OVERRIDE=bash shelly
```

## Platform Support

- **macOS** - Fully supported (Zsh default since Catalina, Bash, Tcsh)
- **Linux** - Fully supported (Bash, Zsh, Tcsh)
- **Windows** - Partial support (PowerShell, WSL recommended)

# Shelly

`log-helper` is a command-line tool that helps you debug failing commands by analyzing their error output. It uses AI to provide suggestions and solutions.

## Features

- **Automatic Error Analysis:** If a command fails, `log-helper` analyzes the error and provides a detailed explanation and solution.
- **Command Correction:** If you type a command that doesn't exist, `log-helper` suggests a correction.
- **Manual Error Analysis:** You can manually paste an error message for analysis.
- **Code Snippet Extraction:** For errors in your code, it extracts and displays the relevant code snippet from the stack trace.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Harshita-Rupani29/Log-Helper_agent.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd Log-Helper_agent
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```
4.  Make the `log-helper.js` script executable:
    ```bash
    chmod +x log-helper.js
    ```

## Usage

### Analyzing the Last Command

If you run a command and it fails, you can immediately run `log-helper` without any arguments to analyze the error from the last command.

```bash
# Run a command that fails
node deep-test/main.js

# Run log-helper to analyze the error
log-helper
```

### Analyzing a Specific Command

You can pass a command directly to `log-helper` to execute and analyze it.

```bash
log-helper "node deep-test/main.js"
```

### Command Correction

If you misspell a command, `log-helper` will suggest a correction.

```bash
# Misspell a command
gitt status

# Run log-helper
log-helper
```

This will prompt you with: `Did you mean: git status?`

### Manual Error Analysis

If a command runs successfully but you still want to analyze an error, `log-helper` will prompt you to enter the error manually.

```bash
# Run a successful command
ls

# Run log-helper
log-helper
```

This will prompt you with: `The command executed successfully. Do you still want to analyze an error?` If you confirm, you can paste the error message for analysis.

## How It Works

`log-helper` uses `@juspay/neurolink` to send the error message and command history to an AI model for analysis. For code-related errors, it parses the stack trace to find the file path and line number, then extracts a snippet of the code to provide more context for the analysis.

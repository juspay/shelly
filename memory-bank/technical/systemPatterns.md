# System Patterns: Shelly CLI Assistant

**Architecture Overview:**

The system consists of a command-line interface (CLI) that interacts with the user's shell, an AI engine that analyzes command-line history and error messages, and a set of modules for providing suggestions and fixing errors.

**Design Patterns:**

*   **Command Pattern:** The CLI uses the command pattern to encapsulate user commands and execute them through a central interface.
*   **Observer Pattern:** The CLI observes the user's command-line history and triggers the AI engine when an error occurs.
*   **Strategy Pattern:** The AI engine uses the strategy pattern to select the appropriate algorithm for analyzing the error and providing suggestions.

**Component Relationships:**

```
[User's Shell] → [Shelly CLI] → [AI Engine (@juspay/neurolink)] → [Suggestion Module]
      ↓
[Command History]
```

**Data Flow:**

1.  The user types a command in the shell.
2.  The shell executes the command and captures the output.
3.  If an error occurs, the shell notifies Shelly.
4.  Shelly retrieves the command history and the error message.
5.  Shelly sends the command history and the error message to the AI Engine.
6.  The AI Engine analyzes the data and generates a list of suggestions.
7.  Shelly displays the suggestions to the user.
8.  The user selects a suggestion.
9.  Shelly executes the suggestion or provides instructions to the user.
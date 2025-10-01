# Product Context: Shelly CLI Assistant

**Problems Solved:**

*   Command-line users often encounter errors when typing commands, which can be time-consuming to debug and fix.
*   Existing debugging tools can be complex and difficult to use, especially for novice users.
*   Users often rely on searching online forums or documentation to find solutions to command-line errors, which can be inefficient.

**Target Users:**

*   Developers
*   System administrators
*   Command-line enthusiasts
*   Anyone who uses a terminal and wants help with debugging commands.

**User Workflows:**

1.  **Error Encounter:** User types a command in the terminal and encounters an error.
2.  **Shelly Invocation:** The user invokes Shelly (either automatically or manually) to analyze the error.
3.  **AI Analysis:** Shelly analyzes the command history and the error message to identify the root cause of the error.
4.  **Suggestion Display:** Shelly displays a list of AI-powered suggestions for fixing the error.
5.  **Interactive Prompt (Optional):** If the AI requires more information, Shelly presents an interactive prompt to the user.
6.  **Solution Implementation:** The user selects a suggestion or provides additional information, and Shelly automatically fixes the error or provides instructions on how to fix it.

**Solution Overview:**

Shelly is an intelligent CLI assistant that analyzes your command-line history to provide smart, AI-powered suggestions for failed commands. Shelly helps you debug and fix errors without leaving your terminal, boosting productivity.  It leverages AI to understand the context of the error and provide targeted solutions. The tool uses `inquirer` for interactive prompts and `@juspay/neurolink` for AI-related functionality.
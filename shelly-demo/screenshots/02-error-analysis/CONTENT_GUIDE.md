# Error Analysis Screenshots Guide

## Required Screenshots

### 1. command-failure.png
**Purpose**: Show a typical command failure that Shelly can help with
**Content**:
- Terminal showing a failed command (e.g., `grp "pattern" file.txt`)
- Error message: `grp: command not found`
- Show the cursor ready for next command
- Include realistic directory context (project folder)
**Command Examples**:
```bash
$ grp "hello" src/main.js
grp: command not found
$ █
```

### 2. shelly-analysis.png
**Purpose**: Show Shelly's AI analysis in action
**Content**:
- Previous failed command visible
- `$ shelly` command executed
- Full Neurolink analysis output:
  - "Analyzing previous command" message
  - "Maybe you meant:" suggestion
  - AI analysis section with detailed explanation
  - Suggested corrections
**Example Output**:
```bash
$ shelly
Analyzing previous command: "grp "hello" src/main.js"

Maybe you meant: grep "hello" src/main.js

--- Neurolink Analysis ---
The error "grp: command not found" indicates that the shell could not find the 'grp' command.
The correct command is likely 'grep' which is used for searching text patterns in files.
Common typos include:
- grp → grep
- git → gti
- npm → nmp
--------------------------
```

## Technical Specifications
- **Terminal Font**: Use a clear monospace font (JetBrains Mono, Fira Code)
- **Colors**: Ensure error messages are clearly visible (red text)
- **Window Size**: Full terminal window, not just command snippets
- **Timing**: Show realistic timing - don't make it look instant
- **Context**: Include realistic project directories and file names
